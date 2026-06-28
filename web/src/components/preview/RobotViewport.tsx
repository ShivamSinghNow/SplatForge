import { ContactShadows, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import type { RoboticsViewportData } from '../../lib/types/roboticsRender';
import type { PreviewDisplayOptions, PreviewViewMode } from '../../lib/types/worldRender';
import { RENDER_COLORS } from '../../lib/render/robotPresets';
import { CameraController, type CameraControllerHandle } from './CameraController';
import { RobotScene } from './RobotScene';
import { RoboticsGrid } from './RoboticsGrid';

interface RobotViewportProps {
  data: RoboticsViewportData;
  viewMode: PreviewViewMode;
  display: PreviewDisplayOptions;
  cameraRef: React.RefObject<CameraControllerHandle | null>;
  followTarget: { x: number; y: number; z: number } | null;
}

export function RobotViewport({ data, viewMode, display, cameraRef, followTarget }: RobotViewportProps) {
  return (
    <Suspense fallback={null}>
      <color attach="background" args={[RENDER_COLORS.background]} />
      <fog attach="fog" args={[RENDER_COLORS.background, 3.5, 8.5]} />

      <ambientLight color="#b8c4d8" intensity={0.32} />
      <spotLight
        angle={0.48}
        castShadow
        color="#eef2ff"
        intensity={2.6}
        penumbra={0.85}
        position={[1.8, 3.4, 1.6]}
        shadow-bias={-0.00015}
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight color={RENDER_COLORS.robotAccent} intensity={0.35} position={[-1.5, 1.2, -0.8]} />
      <pointLight color="#8090a8" intensity={0.25} position={[0.8, 0.6, -1.2]} />

      <CameraController followTarget={followTarget} presets={data.cameraPresets} ref={cameraRef} />
      <RoboticsGrid visible={display.showGrid} />
      <RobotScene data={data} display={display} viewMode={viewMode} />
      <Environment preset="warehouse" />
      <ContactShadows blur={2.4} color="#000000" far={2} opacity={0.38} position={[0, -0.01, 0]} resolution={512} scale={10} />
    </Suspense>
  );
}
