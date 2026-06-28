import { memo } from 'react';
import type { SceneObjectData } from '../../lib/types/worldRender';

interface TabletopWorldProps {
  table: SceneObjectData;
}

export const TabletopWorld = memo(function TabletopWorld({ table }: TabletopWorldProps) {
  return (
    <group position={[table.position.x, table.position.y, table.position.z]}>
      <mesh receiveShadow scale={[table.scale.x, table.scale.y, table.scale.z]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1a1f28" roughness={0.82} metalness={0.18} />
      </mesh>
      <mesh
        receiveShadow
        position={[0, table.scale.y * 0.51 + 0.002, 0]}
        scale={[table.scale.x * 0.98, 0.008, table.scale.z * 0.98]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#252b36" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, -table.scale.y * 0.5 - 0.04, 0]} scale={[table.scale.x * 0.85, 0.08, table.scale.z * 0.85]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#12161e" roughness={0.9} metalness={0.05} />
      </mesh>
    </group>
  );
});
