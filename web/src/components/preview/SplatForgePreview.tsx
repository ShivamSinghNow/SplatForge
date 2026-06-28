import type { LoopStepId, TrainingTask, TrainingWorld } from '../../lib/types/splatforge';

interface SplatForgePreviewProps {
  world: TrainingWorld;
  task: TrainingTask;
  currentStep: LoopStepId;
  policyVersion: string;
}

// Real MuJoCo rollouts rendered to GIF (see sim/render_rollout.py). The robot
// physically grasps + lifts the mug on success, and misses on a failed attempt.
const FAIL_STEPS: LoopStepId[] = ['attempt', 'critique', 'curriculum', 'train'];

export function SplatForgePreview({ world, task, currentStep, policyVersion }: SplatForgePreviewProps) {
  const failing = FAIL_STEPS.includes(currentStep);
  const clip = failing ? '/pick_fail.gif' : '/pick_success.gif';
  const outcome = failing
    ? 'grasp missed'
    : currentStep === 'world'
      ? 'reconstructed scene'
      : 'grasp succeeded';

  return (
    <section className="preview-stage" aria-label="Reconstructed robot training world">
      <div className="preview-hud preview-hud-top">
        <div>
          <span className="hud-kicker">Reconstructed world</span>
          <strong>{world.name}</strong>
        </div>
        <div className="hud-pill">{world.sourceType === 'placeholder' ? 'MuJoCo rollout' : world.sourceType}</div>
      </div>

      <img className="preview-clip" src={clip} alt={`Robot pick rollout — ${outcome}`} />

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
          <strong>{currentStep} · {outcome}</strong>
        </div>
      </div>
    </section>
  );
}
