import { Line } from '@react-three/drei';
import { memo, useMemo } from 'react';
import type { TrajectoryPoint, Vec3 } from '../../lib/types/worldRender';

interface TrajectoryPathProps {
  points: TrajectoryPoint[];
  visible?: boolean;
  color?: string;
  opacity?: number;
  dashed?: boolean;
  activeIndex?: number;
}

function toLinePoints(points: TrajectoryPoint[]): Vec3[] {
  return points.map((point) => point.position);
}

export const TrajectoryPath = memo(function TrajectoryPath({
  points,
  visible = true,
  color = '#4ba3ff',
  opacity = 0.92,
  dashed = false,
  activeIndex,
}: TrajectoryPathProps) {
  const linePoints = useMemo(() => {
    const positions = toLinePoints(points);
    if (positions.length < 2) {
      return [];
    }
    return positions.map((point) => [point.x, point.y, point.z] as [number, number, number]);
  }, [points]);

  if (!visible || linePoints.length < 2) {
    return null;
  }

  const activePoint =
    activeIndex !== undefined && points[activeIndex]
      ? points[activeIndex].position
      : points[points.length - 1]?.position;

  return (
    <group>
      <Line
        points={linePoints}
        color={color}
        lineWidth={2.5}
        transparent
        opacity={opacity}
        dashed={dashed}
        dashSize={0.08}
        gapSize={0.05}
      />
      {activePoint ? (
        <mesh position={[activePoint.x, activePoint.y, activePoint.z]}>
          <sphereGeometry args={[0.028, 16, 12]} />
          <meshStandardMaterial color="#4ba3ff" emissive="#6ec8ff" emissiveIntensity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
});
