import { Cone } from '@react-three/drei';
import { memo } from 'react';
import type { EndEffectorType } from '../../lib/types/roboticsRender';
import type { Vec3 } from '../../lib/types/worldRender';
import { RENDER_COLORS } from '../../lib/render/robotPresets';

interface EndEffectorProps {
  type: EndEffectorType;
  position: Vec3;
  openAmount: number;
  status: string;
  accent?: string;
}

export const EndEffector = memo(function EndEffector({
  type,
  position,
  openAmount,
  status,
  accent = RENDER_COLORS.robotAccent,
}: EndEffectorProps) {
  const fingerOffset = 0.028 + openAmount * 0.045;
  const statusColor = status === 'moving' || status === 'grasping' ? accent : status === 'failed' || status === 'error' ? RENDER_COLORS.failure : '#8a93a3';

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.05, 0.085, 0.14]} />
        <meshStandardMaterial color={RENDER_COLORS.robotMetal} metalness={0.55} roughness={0.38} />
      </mesh>

      {type === 'two_finger' || type === 'clamp' ? (
        <>
          <mesh castShadow position={[0, -0.015, fingerOffset]}>
            <boxGeometry args={[0.018, 0.12, 0.022]} />
            <meshStandardMaterial color="#d4dae4" emissive={statusColor} emissiveIntensity={0.12} metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh castShadow position={[0, -0.015, -fingerOffset]}>
            <boxGeometry args={[0.018, 0.12, 0.022]} />
            <meshStandardMaterial color="#d4dae4" emissive={statusColor} emissiveIntensity={0.12} metalness={0.4} roughness={0.3} />
          </mesh>
        </>
      ) : null}

      {type === 'suction' ? (
        <mesh castShadow position={[0, -0.04, 0]} rotation={[Math.PI, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.038, 0.03, 28]} />
          <meshStandardMaterial color="#3a404c" emissive={accent} emissiveIntensity={0.2} metalness={0.6} roughness={0.25} />
        </mesh>
      ) : null}

      {type === 'magnetic' ? (
        <mesh castShadow position={[0, -0.035, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.018, 24]} />
          <meshStandardMaterial color="#4a505c" emissive="#8899aa" emissiveIntensity={0.25} metalness={0.75} roughness={0.2} />
        </mesh>
      ) : null}

      {type === 'camera_probe' ? (
        <Cone args={[0.05, 0.12, 4]} position={[0, -0.05, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} transparent opacity={0.55} />
        </Cone>
      ) : null}

      {type === 'custom_tool' ? (
        <mesh castShadow position={[0, -0.03, 0.05]}>
          <boxGeometry args={[0.03, 0.08, 0.1]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.15} metalness={0.5} roughness={0.35} />
        </mesh>
      ) : null}

      <mesh position={[0, 0.045, 0]}>
        <sphereGeometry args={[0.014, 12, 10]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
});
