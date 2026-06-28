import { memo, useMemo } from 'react';
import type { RobotState, Vec3 } from '../../lib/types/worldRender';
import { ObjectLabel } from './ObjectLabel';

interface RobotArmProps {
  robot: RobotState;
  showLabel?: boolean;
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function segmentRotation(from: Vec3, to: Vec3): [number, number, number] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.asin(dy / length);
  return [pitch, yaw, 0];
}

function ArmSegment({
  from,
  to,
  thickness,
  color,
}: {
  from: Vec3;
  to: Vec3;
  thickness: number;
  color: string;
}) {
  const center = midpoint(from, to);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const rotation = segmentRotation(from, to);

  return (
    <mesh
      castShadow
      position={[center.x, center.y, center.z]}
      rotation={[rotation[0], rotation[1], 0]}
    >
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.5} />
    </mesh>
  );
}

export const RobotArm = memo(function RobotArm({ robot, showLabel = true }: RobotArmProps) {
  const base = useMemo(
    () => ({ x: robot.basePosition.x, y: robot.basePosition.y + 0.12, z: robot.basePosition.z }),
    [robot.basePosition],
  );
  const elbow = useMemo(() => midpoint(base, robot.gripperPosition), [base, robot.gripperPosition]);

  return (
    <group>
      <mesh castShadow position={[base.x, base.y - 0.06, base.z]}>
        <cylinderGeometry args={[0.16, 0.19, 0.12, 36]} />
        <meshStandardMaterial color="#151a24" roughness={0.45} metalness={0.55} />
      </mesh>
      <mesh castShadow position={[base.x, base.y, base.z]}>
        <cylinderGeometry args={[0.09, 0.11, 0.05, 28]} />
        <meshStandardMaterial
          color="#3ddc97"
          roughness={0.3}
          metalness={0.65}
          emissive="#3ddc97"
          emissiveIntensity={0.12}
        />
      </mesh>

      <ArmSegment from={base} to={elbow} thickness={0.07} color="#222833" />
      <ArmSegment from={elbow} to={robot.gripperPosition} thickness={0.055} color="#2a3140" />

      <mesh castShadow position={[elbow.x, elbow.y, elbow.z]}>
        <sphereGeometry args={[0.045, 20, 16]} />
        <meshStandardMaterial color="#3ddc97" roughness={0.25} metalness={0.7} emissive="#3ddc97" emissiveIntensity={0.1} />
      </mesh>

      <ObjectLabel label="robot arm" position={[base.x, base.y + 0.95, base.z]} visible={showLabel} tone="muted" />
    </group>
  );
});
