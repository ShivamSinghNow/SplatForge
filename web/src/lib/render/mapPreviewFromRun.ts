import type { EpisodeCard, RunSummary } from '../api/types';
import type { LoopStepId } from '../types/splatforge';
import { buildDefaultWorld } from './defaultWorld';
import type { LoopStepId as RenderLoopStep, WorldRenderData } from '../types/worldRender';

function episodeScore(episode: EpisodeCard): number {
  if (episode.status === 'success') {
    return 100;
  }
  const heightError = Number(episode.metrics.gripper_height_error_m ?? 0.09);
  const contacts = Number(episode.metrics.contact_count ?? 0);
  const heightComponent = Math.max(0, 50 - (heightError / 0.09) * 50);
  const contactComponent = Math.min(50, contacts * 25);
  return Math.round(heightComponent + contactComponent);
}

const STEP_MAP: Record<string, RenderLoopStep> = {
  Attempt: 'attempt',
  Critique: 'critique',
  Variants: 'curriculum',
  'Policy Update': 'train',
  Retest: 'retest',
};

export function mapTimelineToStep(timeline: string[], phase: string): LoopStepId {
  if (phase === 'retest_success') {
    return 'improve';
  }
  const last = timeline[timeline.length - 1];
  return (last ? STEP_MAP[last] : undefined) ?? 'world';
}

export function buildPreviewFromRun(
  run: RunSummary | null,
  sceneName: string,
  currentStep: LoopStepId,
): WorldRenderData {
  const base = buildDefaultWorld();
  base.name = sceneName.replace(/_/g, ' ');
  base.worldId = run?.scene ?? sceneName;
  base.currentLoopStep = currentStep as RenderLoopStep;
  base.currentStepLabel = currentStep;

  if (!run) {
    base.decisionLog = undefined;
    base.policyVersion = 'policy_v0';
    base.adapterVersion = 'adapter_v0';
    base.markers = [];
    return base;
  }

  const policyVersion = run.retest?.policy_version ?? run.initial_attempt.policy_version;
  base.policyVersion = policyVersion;
  base.adapterVersion = policyVersion;
  base.decisionLog = run.failure_cause ?? run.initial_attempt.summary;

  const markers = base.markers.filter((marker) => marker.type !== 'failure' && marker.type !== 'success');
  if (run.failure_cause && run.initial_attempt.status === 'failure') {
    markers.push({
      type: 'failure',
      position: { x: 0.31, y: 0.14, z: 0.01 },
      label: run.failure_cause.slice(0, 48),
      frameIndex: 0,
      pulse: ['critique', 'curriculum', 'train', 'attempt'].includes(currentStep),
    });
  }
  if (run.retest?.status === 'success') {
    markers.push({
      type: 'success',
      position: { x: 0.55, y: 0.1, z: 0.28 },
      label: 'retest success',
      frameIndex: 0,
      pulse: ['retest', 'improve'].includes(currentStep),
    });
  }
  base.markers = markers;

  run.variants.forEach((variant, index) => {
    base.objects.push({
      id: `variant_${index}`,
      type: 'obstacle',
      label: variant.label,
      position: { x: 0.18 + index * 0.08, y: 0.08, z: 0.18 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 0.12, y: 0.12, z: 0.12 },
      status: 'planned',
      material: {
        color: [120, 120, 120],
        opacity: 0.55,
        wireframe: true,
        highlight: false,
      },
    });
  });

  return base;
}

export function scoreFromRun(run: RunSummary | null): { before: number; after: number } {
  if (!run) {
    return { before: 0, after: 0 };
  }
  const before = episodeScore(run.initial_attempt);
  const after = run.retest ? episodeScore(run.retest) : before;
  return { before, after };
}
