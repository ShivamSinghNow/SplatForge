import { useEffect, useRef } from 'react';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { applyArmPlacement, buildRobotArm, type ArmPlacement, type ArmRig, type RobotArm } from './robotArm';

export interface SplatScene {
  id: string;
  name: string;
  src: string; // /splats/<file>.splat | .ply | .ksplat
  rollout?: string; // /pick_<name>.mp4 -- the MuJoCo grasp clip for this scene
  cameraUp?: [number, number, number];
  cameraPosition?: [number, number, number];
  cameraLookAt?: [number, number, number];
  armRig?: string; // /rigs/<name>.json -- MuJoCo arm to play inside the splat
  armPlacement?: ArmPlacement; // default placement (overridden by live calibration)
}

interface SplatViewerProps {
  scene: SplatScene;
  onError?: (message: string) => void;
  placement?: ArmPlacement; // live calibration; falls back to scene.armPlacement
}

// Real Gaussian-splat viewer. sharedMemoryForWorkers:false avoids the COOP/COEP
// header requirement (SharedArrayBuffer), so it runs under a plain dev server.
// When the scene has an armRig, the MuJoCo arm is rebuilt in three.js, dropped
// into the splat scene, and its reach->grasp trajectory is ping-ponged.
export function SplatViewer({ scene, onError, placement }: SplatViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<RobotArm | null>(null);
  const canPosRef = useRef<number[]>([0, 0, 0]);
  const placementRef = useRef<ArmPlacement | undefined>(placement);
  placementRef.current = placement ?? scene.armPlacement;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    let disposed = false;
    let viewer: any;
    let armRaf = 0;

    try {
      viewer = new GaussianSplats3D.Viewer({
        rootElement: root,
        sharedMemoryForWorkers: false,
        gpuAcceleratedSort: false,
        cameraUp: scene.cameraUp ?? [0, 1, 0],
        initialCameraPosition: scene.cameraPosition ?? [0, 0, 4],
        initialCameraLookAt: scene.cameraLookAt ?? [0, 0, 0],
        sceneRevealMode: GaussianSplats3D.SceneRevealMode.Gradual,
      });

      viewer
        .addSplatScene(scene.src, { showLoadingUI: true, splatAlphaRemovalThreshold: 5 })
        .then(() => {
          if (!disposed) {
            viewer?.start();
            loadArm();
          }
        })
        .catch((error: unknown) => {
          if (disposed) {
            return;
          }
          onError?.(error instanceof Error ? error.message : `Failed to load ${scene.src}`);
        });
    } catch (error: unknown) {
      onError?.(error instanceof Error ? error.message : 'Splat viewer failed to initialise');
    }

    function loadArm() {
      if (!scene.armRig || disposed) return;
      fetch(scene.armRig)
        .then((response) => (response.ok ? response.json() : null))
        .then((rig: ArmRig | null) => {
          if (!rig || disposed || !viewer?.threeScene) return;
          const arm = buildRobotArm(rig);
          armRef.current = arm;
          canPosRef.current = rig.meta.canPos;
          viewer.threeScene.add(arm.group, arm.marker);
          if (placementRef.current) applyArmPlacement(arm, placementRef.current, rig.meta.canPos);

          const fps = rig.meta.fps || 30;
          const n = arm.frameCount;
          const period = Math.max(1, n - 1) / fps;
          const t0 = performance.now();
          const tick = (now: number) => {
            if (disposed) return;
            const elapsed = (now - t0) / 1000;
            const cycle = elapsed % (2 * period);
            const phase = cycle <= period ? cycle / period : 2 - cycle / period;
            arm.setFrame(Math.round(phase * (n - 1)));
            armRaf = requestAnimationFrame(tick);
          };
          armRaf = requestAnimationFrame(tick);
        })
        .catch(() => {
          /* arm is a nice-to-have; the splat still renders without it */
        });
    }

    return () => {
      disposed = true;
      if (armRaf) cancelAnimationFrame(armRaf);
      try {
        armRef.current?.dispose();
        armRef.current = null;
        viewer?.stop?.();
        viewer?.dispose?.();
      } catch {
        /* viewer may already be torn down */
      }
    };
  }, [scene, onError]);

  // Live calibration: reposition the arm without reloading the splat.
  useEffect(() => {
    const arm = armRef.current;
    const active = placement ?? scene.armPlacement;
    if (arm && active) applyArmPlacement(arm, active, canPosRef.current);
  }, [placement, scene.armPlacement]);

  return <div ref={rootRef} className="splat-viewer" />;
}
