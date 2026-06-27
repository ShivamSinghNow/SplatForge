import { Edges } from '@react-three/drei';
import { memo } from 'react';
import type { TargetZoneData } from '../../lib/types/worldRender';
import { ObjectLabel } from './ObjectLabel';

interface TargetZoneProps {
  zone: TargetZoneData;
  showLabel?: boolean;
}

export const TargetZone = memo(function TargetZone({ zone, showLabel = true }: TargetZoneProps) {
  return (
    <group position={[zone.position.x, zone.position.y, zone.position.z]}>
      <mesh scale={[zone.scale.x, Math.max(zone.scale.y, 0.04), zone.scale.z]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#3dd9e8"
          transparent
          opacity={zone.active ? 0.14 : 0.06}
          roughness={0.2}
          metalness={0.15}
        />
        <Edges color="#3dd9e8" threshold={15} />
      </mesh>
      <mesh
        position={[0, 0.022, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[zone.scale.x * 1.05, zone.scale.z * 1.05, 1]}
      >
        <ringGeometry args={[0.42, 0.5, 48]} />
        <meshBasicMaterial color="#3dd9e8" transparent opacity={0.42} />
      </mesh>
      <ObjectLabel label={zone.label} position={[0, 0.18, 0]} visible={showLabel} tone="accent" />
    </group>
  );
});
