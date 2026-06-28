import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useRef } from 'react';
import type { Mesh } from 'three';
import type { Vec3 } from '../../lib/types/worldRender';

interface FailureMarkerProps {
  position: Vec3;
  label: string;
  visible?: boolean;
  pulse?: boolean;
}

export const FailureMarker = memo(function FailureMarker({
  position,
  label,
  visible = true,
  pulse = false,
}: FailureMarkerProps) {
  const ringRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current || !pulse) {
      return;
    }
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.12;
    ringRef.current.scale.setScalar(scale);
  });

  if (!visible) {
    return null;
  }

  return (
    <group position={[position.x, position.y + 0.06, position.z]}>
      <mesh>
        <sphereGeometry args={[0.035, 20, 16]} />
        <meshStandardMaterial color="#c94a5a" emissive="#c94a5a" emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.075, 32]} />
        <meshBasicMaterial color="#c94a5a" transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 0.055, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.055, 0.008, 0.008]} />
        <meshBasicMaterial color="#f0a0a0" />
      </mesh>
      <mesh position={[0, 0.055, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.055, 0.008, 0.008]} />
        <meshBasicMaterial color="#f0a0a0" />
      </mesh>
      <Html position={[0, 0.14, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <span className="scene-marker scene-marker-danger">{label}</span>
      </Html>
    </group>
  );
});
