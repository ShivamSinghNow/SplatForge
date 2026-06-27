import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RoboticsViewportData } from '../../lib/types/roboticsRender';
import type { PreviewDisplayOptions, PreviewViewMode } from '../../lib/types/worldRender';
import { DEFAULT_DISPLAY_OPTIONS } from '../../lib/types/worldRender';
import { CameraController, type CameraControllerHandle } from './CameraController';
import { RenderToolbar } from './RenderToolbar';
import { RobotViewport } from './RobotViewport';

interface SplatForgePreviewProps {
  data: RoboticsViewportData;
  taskLabel?: string;
  initialViewMode?: PreviewViewMode;
}

export function SplatForgePreview({ data, taskLabel, initialViewMode }: SplatForgePreviewProps) {
  const cameraRef = useRef<CameraControllerHandle>(null);
  const [viewMode, setViewMode] = useState<PreviewViewMode>(initialViewMode ?? data.taskScene.cameraMode ?? 'live');
  const [display, setDisplay] = useState<PreviewDisplayOptions>(DEFAULT_DISPLAY_OPTIONS);
  const followTarget = display.followRobot ? data.robot.gripperPosition : null;

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const frameLabel = useMemo(() => {
    const frame = data.currentFrame + 1;
    const total = Math.max(data.frameCount, 1);
    return `frame ${frame}/${total}`;
  }, [data.currentFrame, data.frameCount]);

  return (
    <section className="preview-stage" aria-label="Robot training world preview">
      <div className="preview-hud preview-hud-top">
        <div>
          <span className="hud-kicker">world</span>
          <strong>{data.name}</strong>
        </div>
        <div className="preview-hud-meta">
          <span className="hud-pill">{data.policyVersion}</span>
          <span className="hud-pill hud-pill-accent">{data.currentLoopStep}</span>
        </div>
      </div>

      <RenderToolbar
        display={display}
        frameLabel={frameLabel}
        onDisplayChange={(patch) => setDisplay((current) => ({ ...current, ...patch }))}
        onResetCamera={() => cameraRef.current?.reset()}
        onSideView={() => {
          const preset = data.cameraPresets.find((item) => item.id === 'side');
          if (preset) {
            cameraRef.current?.applyPreset(preset);
          }
        }}
        onToggleFollow={() => setDisplay((current) => ({ ...current, followRobot: !current.followRobot }))}
        onTopView={() => {
          const preset = data.cameraPresets.find((item) => item.id === 'top');
          if (preset) {
            cameraRef.current?.applyPreset(preset);
          }
        }}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
      />

      <Canvas camera={{ fov: 42, position: [2.15, 1.62, 2.1] }} shadows>
        <RobotViewport cameraRef={cameraRef} data={data} display={display} followTarget={followTarget} viewMode={viewMode} />
      </Canvas>

      <div className="preview-hud preview-hud-bottom">
        <div>
          <span className="hud-kicker">task</span>
          <strong>{taskLabel ?? (data.taskScene.instruction || data.taskScene.taskType)}</strong>
        </div>
        <div>
          <span className="hud-kicker">robot</span>
          <strong>{data.robotConfig.name}</strong>
        </div>
        <div>
          <span className="hud-kicker">effector</span>
          <strong>{data.robotConfig.endEffector.replace(/_/g, ' ')}</strong>
        </div>
        {data.decisionLog ? (
          <div>
            <span className="hud-kicker">log</span>
            <strong>{data.decisionLog}</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
