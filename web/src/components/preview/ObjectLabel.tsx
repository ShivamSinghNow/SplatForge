import { Html } from '@react-three/drei';
import { memo } from 'react';

interface ObjectLabelProps {
  label: string;
  position?: [number, number, number];
  visible?: boolean;
  tone?: 'default' | 'muted' | 'accent';
}

export const ObjectLabel = memo(function ObjectLabel({
  label,
  position = [0, 0.22, 0],
  visible = true,
  tone = 'default',
}: ObjectLabelProps) {
  if (!visible) {
    return null;
  }

  return (
    <Html position={position} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <span className={`scene-label scene-label-${tone}`}>{label}</span>
    </Html>
  );
});
