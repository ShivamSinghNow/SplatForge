import { memo } from 'react';
import type { SceneObjectData } from '../../lib/types/worldRender';
import { ObjectLabel } from './ObjectLabel';

interface ManipulationObjectProps {
  object: SceneObjectData;
  showLabel?: boolean;
}

export const ManipulationObject = memo(function ManipulationObject({
  object,
  showLabel = true,
}: ManipulationObjectProps) {
  const [r, g, b] = object.material.color;
  const color = `rgb(${r}, ${g}, ${b})`;
  const rotation: [number, number, number] = [object.rotation.x, object.rotation.y, object.rotation.z];

  if (object.type === 'mug') {
    return (
      <group
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[rotation[0], rotation[1], rotation[2]]}
      >
        <mesh castShadow position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.1, 0.085, 0.18, 40]} />
          <meshStandardMaterial
            color={color}
            roughness={object.material.roughness ?? 0.38}
            metalness={0.12}
            emissive={object.material.highlight ? '#3ddc97' : '#000000'}
            emissiveIntensity={object.material.highlight ? 0.15 : 0}
          />
        </mesh>
        <mesh castShadow position={[0.095, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.062, 0.014, 16, 36, Math.PI * 1.15]} />
          <meshStandardMaterial color={color} roughness={0.42} metalness={0.08} />
        </mesh>
        <mesh castShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.102, 0.102, 0.012, 32]} />
          <meshStandardMaterial color="#e8ebf2" roughness={0.3} />
        </mesh>
        <ObjectLabel label={object.label} position={[0, 0.28, 0]} visible={showLabel} />
      </group>
    );
  }

  if (object.type === 'obstacle') {
    return (
      <group position={[object.position.x, object.position.y, object.position.z]}>
        <mesh castShadow scale={[object.scale.x, object.scale.y, object.scale.z]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#1a1a1a"
            wireframe={object.material.wireframe}
            transparent
            opacity={0.55}
            emissive="#3ddc97"
            emissiveIntensity={0.08}
          />
        </mesh>
        <ObjectLabel label={object.label} position={[0, object.scale.y * 0.7, 0]} visible={showLabel} tone="muted" />
      </group>
    );
  }

  if (object.type === 'block') {
    return (
      <mesh
        castShadow
        position={[object.position.x, object.position.y, object.position.z]}
        scale={[object.scale.x, object.scale.y, object.scale.z]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
    );
  }

  return null;
});
