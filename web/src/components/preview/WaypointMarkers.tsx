import { Instances, Instance } from '@react-three/drei';
import { memo, useMemo } from 'react';
import type { TrajectoryPoint } from '../../lib/types/worldRender';

interface WaypointMarkersProps {
  points: TrajectoryPoint[];
  visible?: boolean;
  activeIndex?: number;
}

export const WaypointMarkers = memo(function WaypointMarkers({
  points,
  visible = true,
  activeIndex,
}: WaypointMarkersProps) {
  const waypointPoints = useMemo(
    () => points.filter((_, index) => index > 0 && index < points.length - 1),
    [points],
  );

  if (!visible || waypointPoints.length === 0) {
    return null;
  }

  return (
    <Instances limit={waypointPoints.length} range={waypointPoints.length}>
      <sphereGeometry args={[0.018, 12, 10]} />
      <meshStandardMaterial color="#3dd9e8" emissive="#3dd9e8" emissiveIntensity={0.2} />
      {waypointPoints.map((point, index) => {
        const isActive = activeIndex === index + 1;
        return (
          <Instance
            key={`${point.position.x}-${point.position.y}-${point.position.z}-${index}`}
            position={[point.position.x, point.position.y, point.position.z]}
            scale={isActive ? 1.6 : 1}
          />
        );
      })}
    </Instances>
  );
});
