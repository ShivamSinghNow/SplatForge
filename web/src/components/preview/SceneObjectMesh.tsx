import { Edges } from '@react-three/drei';
import { memo } from 'react';
import type { SceneObjectData } from '../../lib/types/worldRender';
import { RENDER_COLORS } from '../../lib/render/robotPresets';
import { ObjectLabel } from './ObjectLabel';

interface SceneObjectMeshProps {
  object: SceneObjectData;
  showLabel?: boolean;
}

export const SceneObjectMesh = memo(function SceneObjectMesh({ object, showLabel = true }: SceneObjectMeshProps) {
  const [r, g, b] = object.material.color;
  const color = `rgb(${r}, ${g}, ${b})`;
  const rotation: [number, number, number] = [object.rotation.x, object.rotation.y, object.rotation.z];

  if (object.type === 'table') {
    return (
      <group position={[object.position.x, object.position.y, object.position.z]}>
        <mesh receiveShadow scale={[object.scale.x, object.scale.y, object.scale.z]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={RENDER_COLORS.table} metalness={0.2} roughness={0.82} />
        </mesh>
        <mesh
          position={[0, object.scale.y * 0.51, 0]}
          receiveShadow
          scale={[object.scale.x * 0.98, 0.01, object.scale.z * 0.98]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#2a303b" metalness={0.35} roughness={0.55} />
        </mesh>
      </group>
    );
  }

  if (object.type === 'mug') {
    return (
      <group position={[object.position.x, object.position.y, object.position.z]} rotation={rotation}>
        <mesh castShadow position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.095, 0.082, 0.17, 40]} />
          <meshStandardMaterial
            color={color}
            emissive={object.material.highlight ? RENDER_COLORS.robotAccent : '#000000'}
            emissiveIntensity={object.material.highlight ? 0.12 : 0}
            metalness={0.14}
            roughness={object.material.roughness ?? 0.38}
          />
        </mesh>
        <mesh castShadow position={[0.09, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.058, 0.013, 16, 36, Math.PI * 1.12]} />
          <meshStandardMaterial color={color} roughness={0.42} />
        </mesh>
        <ObjectLabel label={object.label} position={[0, 0.26, 0]} visible={showLabel} />
      </group>
    );
  }

  if (object.type === 'bowl') {
    return (
      <group position={[object.position.x, object.position.y, object.position.z]}>
        <mesh castShadow>
          <sphereGeometry args={[0.14, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.62} metalness={0.1} />
        </mesh>
        <ObjectLabel label={object.label} position={[0, 0.2, 0]} visible={showLabel} />
      </group>
    );
  }

  if (object.type === 'block' || object.type === 'package' || object.type === 'peg') {
    return (
      <group position={[object.position.x, object.position.y, object.position.z]} rotation={rotation}>
        <mesh castShadow scale={[object.scale.x, object.scale.y, object.scale.z]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={object.material.highlight ? RENDER_COLORS.robotAccent : '#000000'}
            emissiveIntensity={object.material.highlight ? 0.1 : 0}
            roughness={object.material.roughness ?? 0.58}
          />
          {object.material.wireframe ? <Edges color={RENDER_COLORS.robotAccent} threshold={15} /> : null}
        </mesh>
        <ObjectLabel label={object.label} position={[0, object.scale.y * 0.75, 0]} visible={showLabel} tone="muted" />
      </group>
    );
  }

  if (object.type === 'obstacle' || object.type === 'handle' || object.type === 'hole' || object.type === 'drawer') {
    return (
      <group position={[object.position.x, object.position.y, object.position.z]} rotation={rotation}>
        <mesh castShadow scale={[object.scale.x, object.scale.y, object.scale.z]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={object.material.wireframe ? '#1a2230' : color}
            emissive={object.material.highlight ? RENDER_COLORS.robotAccent : '#000000'}
            emissiveIntensity={object.material.highlight ? 0.15 : object.material.wireframe ? 0.08 : 0}
            opacity={object.material.opacity}
            transparent={object.material.opacity < 1}
            wireframe={object.material.wireframe}
          />
        </mesh>
        <ObjectLabel label={object.label} position={[0, object.scale.y * 0.8, 0]} tone="muted" visible={showLabel} />
      </group>
    );
  }

  return null;
});
