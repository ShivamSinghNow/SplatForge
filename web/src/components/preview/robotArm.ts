import * as THREE from 'three';

// One geom of the exported MuJoCo arm rig.
export interface RigGeom {
  type: 'sphere' | 'capsule' | 'cylinder' | 'box';
  size: number[]; // MuJoCo half-extents (sphere:[r], capsule/cylinder:[r,halfLen], box:[hx,hy,hz])
  color: [number, number, number];
  opacity: number;
}

// frames[frame][geom] = [px,py,pz, qx,qy,qz,qw] in MuJoCo world space (Z-up, meters).
export interface ArmRig {
  meta: { fps: number; frameCount: number; canPos: number[]; tableH: number };
  geoms: RigGeom[];
  frames: number[][][];
}

// Placement maps the MuJoCo-frame rig into the splat. The arm is *anchored on
// the can*: `anchor` is the splat point the gripper's grasp endpoint lands on,
// so wherever you put the anchor (the real can), the arm grasps it. `scale`
// sizes the arm; `yawDeg` spins it about the vertical axis (to seat the base on
// the table). A fixed +90deg X rotation maps MuJoCo Z-up to the splat's Y-down.
export interface ArmPlacement {
  scale?: number;
  yawDeg?: number;
  anchor?: [number, number, number];
  showMarker?: boolean;
}

export interface RobotArm {
  group: THREE.Group;
  marker: THREE.Mesh;
  frameCount: number;
  setFrame: (idx: number) => void;
  dispose: () => void;
}

// Build a three.js arm from the rig. Child meshes are posed per-frame in MuJoCo
// world space; the group carries the placement transform.
export function buildRobotArm(rig: ArmRig): RobotArm {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  for (const g of rig.geoms) {
    let geo: THREE.BufferGeometry;
    if (g.type === 'sphere') {
      geo = new THREE.SphereGeometry(g.size[0], 20, 16);
    } else if (g.type === 'box') {
      geo = new THREE.BoxGeometry(g.size[0] * 2, g.size[1] * 2, g.size[2] * 2);
    } else if (g.type === 'cylinder') {
      geo = new THREE.CylinderGeometry(g.size[0], g.size[0], g.size[1] * 2, 24);
      geo.rotateX(Math.PI / 2); // MuJoCo cylinders run along local Z, three.js along Y
    } else {
      geo = new THREE.CapsuleGeometry(g.size[0], g.size[1] * 2, 6, 16);
      geo.rotateX(Math.PI / 2);
    }
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(g.color[0], g.color[1], g.color[2]),
      metalness: 0.25,
      roughness: 0.55,
      transparent: g.opacity < 1,
      opacity: g.opacity,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.renderOrder = 1;
    group.add(mesh);
    meshes.push(mesh);
    disposables.push(geo, material);
  }

  // Lights so the arm is shaded (splats are unlit and unaffected by these).
  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(0.3, 1, 0.6);
  group.add(ambient, key);

  // Grasp-point marker (world space, sized in applyArmPlacement) for calibration.
  const markerGeo = new THREE.SphereGeometry(1, 16, 12);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.85 });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.renderOrder = 2;
  disposables.push(markerGeo, markerMat);

  function setFrame(idx: number): void {
    const frame = rig.frames[idx];
    if (!frame) return;
    for (let i = 0; i < meshes.length; i++) {
      const t = frame[i];
      meshes[i].position.set(t[0], t[1], t[2]);
      meshes[i].quaternion.set(t[3], t[4], t[5], t[6]);
    }
  }

  setFrame(0);

  function dispose(): void {
    group.removeFromParent();
    marker.removeFromParent();
    for (const d of disposables) d.dispose();
  }

  return { group, marker, frameCount: rig.frames.length, setFrame, dispose };
}

// Position/orient/scale the arm so its grasp endpoint (the MuJoCo can position)
// lands on `anchor`. Cheap to call repeatedly (live calibration), no rebuild.
export function applyArmPlacement(arm: RobotArm, placement: ArmPlacement, canPos: number[]): void {
  const scale = placement.scale ?? 1;
  const yaw = ((placement.yawDeg ?? 0) * Math.PI) / 180;
  const anchor = placement.anchor ?? [0, 0, 0];

  const qRx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const q = new THREE.Quaternion().multiplyQuaternions(qYaw, qRx);

  arm.group.quaternion.copy(q);
  arm.group.scale.setScalar(scale);

  const canLocal = new THREE.Vector3(canPos[0], canPos[1], canPos[2]).multiplyScalar(scale).applyQuaternion(q);
  arm.group.position.set(anchor[0] - canLocal.x, anchor[1] - canLocal.y, anchor[2] - canLocal.z);

  arm.marker.visible = placement.showMarker ?? false;
  arm.marker.position.set(anchor[0], anchor[1], anchor[2]);
  arm.marker.scale.setScalar(0.03 * scale + 0.01); // small dot relative to arm size
}
