import { memo, useMemo } from 'react';
import type { RobotRenderConfig } from '../../lib/types/roboticsRender';
import type { Vec3 } from '../../lib/types/worldRender';
import { RENDER_COLORS } from '../../lib/render/robotPresets';
import { EndEffector } from './EndEffector';
import { ObjectLabel } from './ObjectLabel';

interface RobotModelProps {
  config: RobotRenderConfig;
  showLabel?: boolean;
  editMode?: boolean;
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function segmentRotation(from: Vec3, to: Vec3): [number, number, number] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return [Math.asin(dy / length), Math.atan2(dx, dz), 0];
}

function ArmLink({
  from,
  to,
  thickness,
  color,
  emissive,
}: {
  from: Vec3;
  to: Vec3;
  thickness: number;
  color: string;
  emissive?: string;
}) {
  const center = midpoint(from, to);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const rotation = segmentRotation(from, to);

  return (
    <mesh castShadow position={[center.x, center.y, center.z]} rotation={[rotation[0], rotation[1], 0]}>
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 0.1 : 0}
        metalness={0.52}
        roughness={0.4}
      />
    </mesh>
  );
}

function IndustrialArm({
  config,
  showLabel,
  editMode,
}: {
  config: RobotRenderConfig;
  showLabel: boolean;
  editMode: boolean;
}) {
  const base = useMemo(
    () => ({ x: config.basePosition.x, y: config.basePosition.y + 0.1, z: config.basePosition.z }),
    [config.basePosition],
  );
  const shoulder = useMemo(
    () => ({ x: base.x, y: base.y + 0.22, z: base.z }),
    [base],
  );
  const elbow = useMemo(() => midpoint(shoulder, config.gripperPosition), [shoulder, config.gripperPosition]);
  const preset = config.parts[0]?.material.color ?? RENDER_COLORS.robotMetal;

  return (
    <group>
      <mesh castShadow position={[base.x, base.y - 0.05, base.z]}>
        <cylinderGeometry args={[0.17, 0.2, 0.11, 36]} />
        <meshStandardMaterial color="#1a1f28" metalness={0.58} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[shoulder.x, shoulder.y - 0.04, shoulder.z]}>
        <cylinderGeometry args={[0.095, 0.11, 0.07, 28]} />
        <meshStandardMaterial
          color={RENDER_COLORS.robotAccent}
          emissive={RENDER_COLORS.robotAccent}
          emissiveIntensity={editMode ? 0.25 : 0.12}
          metalness={0.62}
          roughness={0.28}
        />
      </mesh>
      <ArmLink color={preset} emissive={RENDER_COLORS.robotAccent} from={shoulder} thickness={0.068} to={elbow} />
      <ArmLink color="#313845" from={elbow} thickness={0.052} to={config.gripperPosition} />
      <mesh castShadow position={[elbow.x, elbow.y, elbow.z]}>
        <sphereGeometry args={[0.042, 20, 16]} />
        <meshStandardMaterial color={RENDER_COLORS.robotAccent} emissive={RENDER_COLORS.robotAccent} emissiveIntensity={0.14} metalness={0.68} roughness={0.25} />
      </mesh>
      <EndEffector
        accent={RENDER_COLORS.robotAccent}
        openAmount={config.gripperOpen}
        position={config.gripperPosition}
        status={config.status}
        type={config.endEffector}
      />
      <ObjectLabel label={config.name} position={[base.x, base.y + 1.05, base.z]} tone="accent" visible={showLabel} />
    </group>
  );
}

function MobileBase({ config, showLabel }: { config: RobotRenderConfig; showLabel: boolean }) {
  return (
    <group>
      <mesh castShadow position={[config.basePosition.x, 0.08, config.basePosition.z]}>
        <boxGeometry args={[0.42, 0.16, 0.36]} />
        <meshStandardMaterial color="#252b35" metalness={0.45} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[config.basePosition.x - 0.16, 0.08, config.basePosition.z - 0.14]}>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <meshStandardMaterial color="#1a1f28" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[config.basePosition.x + 0.16, 0.08, config.basePosition.z - 0.14]}>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <meshStandardMaterial color="#1a1f28" metalness={0.6} roughness={0.4} />
      </mesh>
      <IndustrialArm config={config} editMode={false} showLabel={showLabel} />
    </group>
  );
}

function DroneBody({ config, showLabel }: { config: RobotRenderConfig; showLabel: boolean }) {
  return (
    <group position={[config.basePosition.x, config.basePosition.y, config.basePosition.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.28, 0.06, 0.28]} />
        <meshStandardMaterial color="#2f3540" metalness={0.5} roughness={0.42} />
      </mesh>
      {[
        [0.18, 0.18],
        [-0.18, 0.18],
        [0.18, -0.18],
        [-0.18, -0.18],
      ].map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0.02, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.012, 16]} />
            <meshStandardMaterial color="#3a4250" emissive={RENDER_COLORS.robotAccent} emissiveIntensity={0.08} />
          </mesh>
        </group>
      ))}
      <EndEffector
        accent={RENDER_COLORS.robotAccent}
        openAmount={0.2}
        position={{ x: 0, y: -0.08, z: 0.12 }}
        status={config.status}
        type="camera_probe"
      />
      <ObjectLabel label={config.name} position={[0, 0.22, 0]} tone="accent" visible={showLabel} />
    </group>
  );
}

function HumanoidTorso({ config, showLabel }: { config: RobotRenderConfig; showLabel: boolean }) {
  return (
    <group position={[config.basePosition.x, config.basePosition.y, config.basePosition.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.38, 0.42, 0.2]} />
        <meshStandardMaterial color="#2a303b" metalness={0.48} roughness={0.46} />
      </mesh>
      <group position={[-0.16, 0.18, 0.08]}>
        <IndustrialArm
          config={{
            ...config,
            basePosition: { x: 0, y: 0, z: 0 },
            gripperPosition: { x: 0.22, y: 0.12, z: 0.18 },
          }}
          editMode={false}
          showLabel={false}
        />
      </group>
      <group position={[0.16, 0.18, 0.08]}>
        <IndustrialArm
          config={{
            ...config,
            basePosition: { x: 0, y: 0, z: 0 },
            gripperPosition: { x: 0.22, y: 0.12, z: -0.08 },
          }}
          editMode={false}
          showLabel={false}
        />
      </group>
      <ObjectLabel label={config.name} position={[0, 0.55, 0]} tone="accent" visible={showLabel} />
    </group>
  );
}

export const RobotModel = memo(function RobotModel({ config, showLabel = true, editMode = false }: RobotModelProps) {
  switch (config.type) {
    case 'mobile_manipulator':
    case 'rover_arm':
      return <MobileBase config={config} showLabel={showLabel} />;
    case 'drone_inspection':
      return <DroneBody config={config} showLabel={showLabel} />;
    case 'humanoid_upper':
      return <HumanoidTorso config={config} showLabel={showLabel} />;
    case 'warehouse_picker':
      return (
        <group>
          <mesh castShadow position={[config.basePosition.x, config.basePosition.y + 0.35, config.basePosition.z]}>
            <boxGeometry args={[0.12, 0.7, 0.12]} />
            <meshStandardMaterial color="#353b47" metalness={0.55} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[config.basePosition.x + 0.25, config.basePosition.y + 0.55, config.basePosition.z]}>
            <boxGeometry args={[0.62, 0.08, 0.08]} />
            <meshStandardMaterial color="#2a303b" metalness={0.5} roughness={0.42} />
          </mesh>
          <IndustrialArm config={config} editMode={editMode} showLabel={showLabel} />
        </group>
      );
    default:
      return <IndustrialArm config={config} editMode={editMode} showLabel={showLabel} />;
  }
});
