import { useEffect, useRef, useState } from 'react';
import type { LoopStepId, TrainingTask, TrainingWorld } from '../../lib/types/splatforge';
import { SplatViewer, type SplatScene } from './SplatViewer';

interface SplatForgePreviewProps {
  world: TrainingWorld;
  task: TrainingTask;
  currentStep: LoopStepId;
  policyVersion: string;
  playToken: number;
}

type Mode = 'scene' | 'rollout';

// Two views: the real Gaussian-splat reconstruction (fly-through) and the real
// MuJoCo pick rollout (mp4). A run switches to the rollout and plays it from the top.
export function SplatForgePreview({ world, task, currentStep, policyVersion, playToken }: SplatForgePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<Mode>('scene');
  const [scenes, setScenes] = useState<SplatScene[]>([]);
  const [sceneId, setSceneId] = useState('');
  const [splatError, setSplatError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/splats/scenes.json')
      .then((response) => (response.ok ? response.json() : []))
      .then((list: SplatScene[]) => {
        if (cancelled) return;
        setScenes(list);
        if (list[0]) setSceneId(list[0].id);
      })
      .catch(() => {
        if (!cancelled) setScenes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function playRollout() {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      void video.play().catch(() => {});
    }
  }

  useEffect(() => {
    if (playToken === 0) return; // skip initial mount
    setMode('rollout');
    playRollout();
  }, [playToken]);

  const scene = scenes.find((item) => item.id === sceneId);

  return (
    <section className="preview-stage" aria-label="Reconstructed robot training world">
      <div className="preview-hud preview-hud-top">
        <div>
          <span className="hud-kicker">{mode === 'scene' ? 'Reconstructed world' : 'MuJoCo rollout'}</span>
          <strong>{mode === 'scene' ? scene?.name ?? world.name : 'Pick the mug'}</strong>
        </div>
        <div className="preview-toggle">
          <button className={mode === 'scene' ? 'on' : ''} onClick={() => setMode('scene')} type="button">
            Scene
          </button>
          <button
            className={mode === 'rollout' ? 'on' : ''}
            onClick={() => {
              setMode('rollout');
              playRollout();
            }}
            type="button"
          >
            Rollout
          </button>
        </div>
      </div>

      {mode === 'scene' && scene ? <SplatViewer scene={scene} onError={setSplatError} /> : null}
      {mode === 'scene' && !scene ? (
        <div className="preview-empty">Drop a .splat/.ply in web/public/splats/ and list it in scenes.json</div>
      ) : null}
      {mode === 'scene' && splatError ? <div className="preview-empty">Splat load failed: {splatError}</div> : null}

      <video
        ref={videoRef}
        className="preview-clip"
        src="/pick_success.mp4"
        muted
        playsInline
        preload="auto"
        style={{ display: mode === 'rollout' ? 'block' : 'none' }}
      />

      {mode === 'scene' && scenes.length > 1 ? (
        <div className="preview-scene-picker">
          <select
            value={sceneId}
            onChange={(event) => {
              setSceneId(event.target.value);
              setSplatError(null);
            }}
          >
            {scenes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="preview-hud preview-hud-bottom">
        <div>
          <span className="hud-kicker">Task</span>
          <strong>{task.instruction}</strong>
        </div>
        <div>
          <span className="hud-kicker">Policy</span>
          <strong>{policyVersion}</strong>
        </div>
        <div>
          <span className="hud-kicker">Phase</span>
          <strong>{currentStep}</strong>
        </div>
      </div>
    </section>
  );
}
