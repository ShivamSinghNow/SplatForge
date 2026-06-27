import { memo } from 'react';
import type { Vec3 } from '../../lib/types/worldRender';

interface RobotGripperProps {
  position: Vec3;
  openAmount: number;
  status: string;
}

export const RobotGripper = memo(function RobotGripper({ position, openAmount, status }: RobotGripperProps) {
  const fingerOffset = 0.035 + openAmount * 0.04;
  const accent = status === 'moving' ? '#3ddc97' : status === 'failed' ? '#e54d4d' : '#4a4a4a';

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.055, 0.1, 0.16]} />
        <meshStandardMaterial color="#2a3140" roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh castShadow position={[0, -0.02, fingerOffset]}>
        <boxGeometry args={[0.022, 0.14, 0.028]} />
        <meshStandardMaterial color="#d8dee8" roughness={0.28} metalness={0.4} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      <mesh castShadow position={[0, -0.02, -fingerOffset]}>
        <boxGeometry args={[0.022, 0.14, 0.028]} />
        <meshStandardMaterial color="#d8dee8" roughness={0.28} metalness={0.4} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.018, 12, 10]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
});
