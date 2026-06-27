import type { LoopStepId } from './types/worldRender';
import type { RunMetadata, SceneFrame } from './types/recording';

export interface WorkflowStep {
  id: string;
  label: string;
  status: 'failed' | 'complete' | 'pending' | 'active';
}

export interface RunScores {
  initialScore: number;
  retestScore: number;
  delta: number;
  initialFailed: boolean;
  retestPassed: boolean;
}

const LOOP_STEPS: Array<{ id: LoopStepId | string; label: string }> = [
  { id: 'attempt', label: 'robot failed' },
  { id: 'trace', label: 'trace captured' },
  { id: 'critique', label: 'critics evaluated' },
  { id: 'curriculum', label: 'curriculum generated' },
  { id: 'train', label: 'policy patched' },
  { id: 'retest', label: 'replay verified' },
];

function scoreFromStatus(status: string | null | undefined, failed: boolean): number {
  if (!status) {
    return 0;
  }
  if (failed) {
    return 62;
  }
  return 91;
}

export function deriveRunScores(metadata: RunMetadata | null): RunScores {
  const initialFailed = metadata?.initial_status === 'failure';
  const retestPassed = metadata?.retest_status === 'success';
  const initialScore = metadata ? scoreFromStatus(metadata.initial_status, true) : 0;
  const retestScore = metadata?.retest_status ? scoreFromStatus(metadata.retest_status, !retestPassed) : 0;
  return {
    initialScore: initialFailed ? initialScore : 100,
    retestScore: retestPassed ? retestScore || 91 : retestScore,
    delta: retestPassed && initialFailed ? (retestScore || 91) - (initialScore || 62) : 0,
    initialFailed,
    retestPassed,
  };
}

export function deriveWorkflowSteps(
  metadata: RunMetadata | null,
  currentStep: string | undefined,
): WorkflowStep[] {
  const timeline = new Set((metadata?.timeline ?? []).map((step) => step.toLowerCase()));
  const hasRecording = Boolean(metadata?.frame_count);
  const initialFailed = metadata?.initial_status === 'failure';
  const retestPassed = metadata?.retest_status === 'success';

  const completed = {
    attempt: hasRecording,
    trace: hasRecording && (metadata?.frame_count ?? 0) > 0,
    critique: timeline.has('critique') || Boolean(metadata?.failure_cause),
    curriculum: timeline.has('curriculum'),
    train: timeline.has('train'),
    retest: timeline.has('retest') || timeline.has('improve') || Boolean(metadata?.retest_status),
  };

  const activeId = mapFrameStep(currentStep);

  return LOOP_STEPS.map((step) => {
    let status: WorkflowStep['status'] = 'pending';
    const isComplete = completed[step.id as keyof typeof completed];

    if (step.id === 'attempt' && initialFailed) {
      status = 'failed';
    } else if (step.id === 'retest' && retestPassed) {
      status = 'complete';
    } else if (step.id === 'retest' && metadata?.retest_status === 'failure') {
      status = 'failed';
    } else if (isComplete) {
      status = 'complete';
    } else if (activeId === step.id) {
      status = 'active';
    }

    return { id: step.id, label: step.label, status };
  });
}

function mapFrameStep(step: string | undefined): string {
  if (!step) {
    return 'attempt';
  }
  if (step.startsWith('attempt')) return 'attempt';
  if (step.startsWith('critique')) return 'critique';
  if (step.startsWith('curriculum')) return 'curriculum';
  if (step.startsWith('train')) return 'train';
  if (step.startsWith('retest')) return 'retest';
  if (step.startsWith('world')) return 'trace';
  return 'attempt';
}

export function extractPolicyPatch(frames: SceneFrame[]): string {
  for (const frame of frames) {
    if (frame.step === 'train' && frame.annotations?.policy) {
      return JSON.stringify(frame.annotations.policy, null, 2);
    }
  }
  return '—';
}

export function extractCurriculumNote(frames: SceneFrame[]): string {
  const frame = frames.find((item) => item.step === 'curriculum');
  if (!frame) {
    return '—';
  }
  const variants = frame.objects.filter((obj) => obj.type === 'obstacle');
  return JSON.stringify(
    {
      step: frame.step,
      decision_log: frame.decision_log,
      variants: variants.map((obj) => ({ id: obj.id, label: obj.label })),
    },
    null,
    2,
  );
}
