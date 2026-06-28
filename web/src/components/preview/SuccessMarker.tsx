import { Html } from '@react-three/drei';
import { memo } from 'react';
import type { Vec3 } from '../../lib/types/worldRender';

interface SuccessMarkerProps {
  position: Vec3;
  label: string;
  visible?: boolean;
  pulse?: boolean;
}

export const SuccessMarker = memo(function SuccessMarker({
  position,
  label,
  visible = true,
  pulse = false,
}: SuccessMarkerProps) {
  if (!visible) {
    return null;
  }

  return (
    <group position={[position.x, position.y + 0.08, position.z]}>
      <mesh>
        <sphereGeometry args={[0.038, 20, 16]} />
        <meshStandardMaterial
          color="#4caf82"
          emissive="#4caf82"
          emissiveIntensity={pulse ? 0.55 : 0.3}
          roughness={0.35}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.082, 32]} />
        <meshBasicMaterial color="#4caf82" transparent opacity={0.35} />
      </mesh>
      <Html position={[0, 0.12, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <span className="scene-marker scene-marker-success">{label}</span>
      </Html>
    </group>
  );
});
