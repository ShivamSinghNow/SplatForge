import { useEffect, useRef } from 'react';
import type { LoopStepId, TrainingTask, TrainingWorld } from '../../lib/types/splatforge';

interface SplatForgePreviewProps {
  world: TrainingWorld;
  task: TrainingTask;
  currentStep: LoopStepId;
  policyVersion: string;
  playToken: number;
}

// Real MuJoCo rollout rendered to mp4 (see sim/render_rollout.py): the two-finger
// gripper descends, grasps the mug, and lifts it. Replays from the top on each run.
export function SplatForgePreview({ world, task, currentStep, policyVersion, playToken }: SplatForgePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.currentTime = 0;
    void video.play().catch(() => {
      /* autoplay can be blocked until a user gesture; the Run click provides one */
    });
  }, [playToken]);

  return (
    <section className="preview-stage" aria-label="Reconstructed robot training world">
      <div className="preview-hud preview-hud-top">
        <div>
          <span className="hud-kicker">Reconstructed world</span>
          <strong>{world.name}</strong>
        </div>
        <div className="hud-pill">{world.sourceType === 'placeholder' ? 'MuJoCo rollout' : world.sourceType}</div>
      </div>

      <video
        ref={videoRef}
        className="preview-clip"
        src="/pick_success.mp4"
        muted
        playsInline
        autoPlay
        preload="auto"
      />

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
