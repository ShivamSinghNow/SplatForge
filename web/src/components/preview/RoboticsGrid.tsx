import { Grid } from '@react-three/drei';
import { memo } from 'react';
import { RENDER_COLORS } from '../../lib/render/robotPresets';

interface RoboticsGridProps {
  visible?: boolean;
}

export const RoboticsGrid = memo(function RoboticsGrid({ visible = true }: RoboticsGridProps) {
  if (!visible) {
    return null;
  }

  return (
    <group>
      <Grid
        cellColor={RENDER_COLORS.grid}
        cellSize={0.2}
        fadeDistance={9}
        fadeStrength={5}
        infiniteGrid
        position={[0, -0.001, 0]}
        sectionColor="#2a3544"
        sectionSize={1}
        sectionThickness={1.2}
      />

      <mesh position={[0, 0.55, -1.45]} rotation={[0, 0, 0]}>
        <planeGeometry args={[4.2, 2.4, 24, 14]} />
        <meshBasicMaterial color={RENDER_COLORS.gridFade} transparent opacity={0.22} wireframe />
      </mesh>

      <mesh position={[-1.55, 0.45, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.2, 2, 20, 12]} />
        <meshBasicMaterial color={RENDER_COLORS.gridFade} transparent opacity={0.14} wireframe />
      </mesh>

      <gridHelper args={[6, 30, '#243040', '#151c26']} position={[0, -0.0005, 0]} />
    </group>
  );
});
