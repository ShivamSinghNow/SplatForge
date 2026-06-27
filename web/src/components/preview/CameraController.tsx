import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { CameraPreset, Vec3 } from '../../lib/types/worldRender';

export interface CameraControllerHandle {
  reset: () => void;
  applyPreset: (preset: CameraPreset) => void;
  setFollowTarget: (target: Vec3 | null) => void;
}

interface CameraControllerProps {
  presets: CameraPreset[];
  followTarget?: Vec3 | null;
  enabled?: boolean;
}

export const CameraController = forwardRef<CameraControllerHandle, CameraControllerProps>(
  function CameraController({ presets, followTarget, enabled = true }, ref) {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const { camera } = useThree();
    const followRef = useRef<Vec3 | null>(null);
    const defaultPreset = presets[0];

    useImperativeHandle(ref, () => ({
      reset() {
        if (!defaultPreset || !controlsRef.current) {
          return;
        }
        this.applyPreset(defaultPreset);
      },
      applyPreset(preset: CameraPreset) {
        camera.position.set(...preset.position);
        controlsRef.current?.target.set(...preset.target);
        controlsRef.current?.update();
      },
      setFollowTarget(target: Vec3 | null) {
        followRef.current = target;
      },
    }));

    useEffect(() => {
      followRef.current = followTarget ?? null;
    }, [followTarget]);

    useFrame((_, delta) => {
      const target = followRef.current;
      if (!target || !controlsRef.current) {
        return;
      }
      const desired = new THREE.Vector3(target.x + 0.55, target.y + 0.45, target.z + 0.75);
      camera.position.lerp(desired, Math.min(1, delta * 2.2));
      controlsRef.current.target.lerp(new THREE.Vector3(target.x, target.y, target.z), Math.min(1, delta * 3));
      controlsRef.current.update();
    });

    if (!enabled) {
      return null;
    }

    return (
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.85}
        maxDistance={5.5}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI / 2.05}
        target={defaultPreset ? new THREE.Vector3(...defaultPreset.target) : undefined}
      />
    );
  },
);
