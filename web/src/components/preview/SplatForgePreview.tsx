import { useEffect, useRef, useState } from 'react';
import type { LoopStepId, TrainingTask, TrainingWorld } from '../../lib/types/splatforge';
import { ArmCalibrationPanel } from './ArmCalibrationPanel';
import type { ArmPlacement } from './robotArm';
import { SplatErrorBoundary } from './SplatErrorBoundary';
import { SplatViewer, type SplatScene } from './SplatViewer';

const placementKey = (id: string) => `splatforge:armPlacement:${id}`;

interface SplatForgePreviewProps {
  world: TrainingWorld;
  task: TrainingTask;
  currentStep: LoopStepId;
  policyVersion: string;
  playToken: number;
  rolloutClip?: string; // override the rollout clip (e.g. play the failed case)
  rolloutLabel?: string; // HUD label for the rollout (e.g. "Grasp the pen")
  instruction?: string; // the live typed command, shown in the bottom HUD
}

type Mode = 'scene' | 'rollout';

// Two views: the real Gaussian-splat reconstruction (fly-through) and the real
// MuJoCo pick rollout (mp4). A run switches to the rollout and plays it from the top.
export function SplatForgePreview({ world, task, currentStep, policyVersion, playToken, rolloutClip, rolloutLabel, instruction }: SplatForgePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<Mode>('scene');
  const [scenes, setScenes] = useState<SplatScene[]>([]);
  const [sceneId, setSceneId] = useState('');
  const [splatError, setSplatError] = useState<string | null>(null);
  const [placement, setPlacement] = useState<ArmPlacement | undefined>(undefined);

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

  // Load the arm placement for the selected scene (saved calibration overrides
  // the default baked into scenes.json).
  useEffect(() => {
    const s = scenes.find((item) => item.id === sceneId);
    if (!s?.armRig) {
      setPlacement(undefined);
      return;
    }
    let stored: ArmPlacement | undefined;
    try {
      const raw = localStorage.getItem(placementKey(s.id));
      if (raw) stored = JSON.parse(raw);
    } catch {
      /* ignore unreadable storage */
    }
    const base: ArmPlacement = { ...(stored ?? s.armPlacement ?? {}) };
    delete base.showMarker; // marker is a transient calibration aid; off by default
    setPlacement(base);
  }, [sceneId, scenes]);

  function updatePlacement(next: ArmPlacement) {
    setPlacement(next);
    const persist: ArmPlacement = { ...next };
    delete persist.showMarker; // never persist the calibration marker
    try {
      localStorage.setItem(placementKey(sceneId), JSON.stringify(persist));
    } catch {
      /* ignore unwritable storage */
    }
  }

  const scene = scenes.find((item) => item.id === sceneId);

  return (
    <section className="preview-stage" aria-label="Reconstructed robot training world">
      <div className="preview-hud preview-hud-top">
        <div>
          <span className="hud-kicker">{mode === 'scene' ? 'Reconstructed world' : 'MuJoCo rollout'}</span>
          <strong>{mode === 'scene' ? scene?.name ?? world.name : rolloutLabel ?? 'Grasp the can'}</strong>
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

      {mode === 'scene' && scene ? (
        <SplatErrorBoundary
          key={scene.id}
          fallback={<div className="preview-empty">Splat viewer unavailable (needs WebGL / a valid scan)</div>}
        >
          <SplatViewer scene={scene} onError={setSplatError} placement={placement} />
        </SplatErrorBoundary>
      ) : null}
      {mode === 'scene' && scene?.armRig && placement ? (
        <ArmCalibrationPanel placement={placement} onChange={updatePlacement} />
      ) : null}
      {mode === 'scene' && !scene ? (
        <div className="preview-empty">Drop a .splat/.ply in web/public/splats/ and list it in scenes.json</div>
      ) : null}
      {mode === 'scene' && splatError ? <div className="preview-empty">Splat load failed: {splatError}</div> : null}

      <video
        ref={videoRef}
        className="preview-clip"
        src={rolloutClip ?? scene?.rollout ?? '/pick_success.mp4'}
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
          <strong>{instruction ?? task.instruction}</strong>
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
