import type { LoopStepId } from '../types/splatforge';
import type { SuccessRatePoint } from '../api/types';

export type DemoBeatId =
  | 'intro'
  | 'flythrough'
  | 'critique'
  | 'curriculum'
  | 'curve'
  | 'retest'
  | 'complete';

export interface DemoBeat {
  id: DemoBeatId;
  label: string;
  durationMs: number;
  loopStep: LoopStepId;
  inspectorSection?: 'council' | 'curriculum' | 'policy' | 'memory';
  navSection?: 'control' | 'runs' | 'memory' | 'council' | 'policy';
  curvePoints?: SuccessRatePoint[];
  rerunJump?: 'failure_frame' | 'gemini_critique' | 'curriculum_generated' | 'retest_success';
}

/** Scripted UI tour — does not call backend. Success curve points are fixture data. */
export const OVERNIGHT_DEMO_BEATS: DemoBeat[] = [
  {
    id: 'intro',
    label: 'Load overnight run',
    durationMs: 4000,
    loopStep: 'world',
    navSection: 'control',
  },
  {
    id: 'flythrough',
    label: 'Fly-through failure attempt',
    durationMs: 28000,
    loopStep: 'attempt',
    navSection: 'memory',
    rerunJump: 'failure_frame',
  },
  {
    id: 'critique',
    label: 'Critic reasoning',
    durationMs: 32000,
    loopStep: 'critique',
    navSection: 'council',
    inspectorSection: 'council',
    rerunJump: 'gemini_critique',
  },
  {
    id: 'curriculum',
    label: 'Generated curriculum',
    durationMs: 28000,
    loopStep: 'curriculum',
    navSection: 'policy',
    inspectorSection: 'curriculum',
    rerunJump: 'curriculum_generated',
  },
  {
    id: 'curve',
    label: 'Success rate climbing',
    durationMs: 32000,
    loopStep: 'train',
    navSection: 'runs',
    inspectorSection: 'policy',
    curvePoints: [
      { index: 1, success_rate: 37, label: 'fixture attempt 1' },
      { index: 2, success_rate: 52, label: 'fixture attempt 2' },
      { index: 3, success_rate: 67, label: 'fixture attempt 3' },
    ],
  },
  {
    id: 'retest',
    label: 'Retest success',
    durationMs: 36000,
    loopStep: 'retest',
    navSection: 'memory',
    inspectorSection: 'policy',
    rerunJump: 'retest_success',
    curvePoints: [
      { index: 1, success_rate: 37, label: 'fixture attempt 1' },
      { index: 2, success_rate: 52, label: 'fixture attempt 2' },
      { index: 3, success_rate: 67, label: 'fixture attempt 3' },
      { index: 4, success_rate: 78, label: 'fixture retest' },
    ],
  },
  {
    id: 'complete',
    label: 'Improvement proof',
    durationMs: 8000,
    loopStep: 'improve',
    navSection: 'control',
    inspectorSection: 'policy',
    curvePoints: [
      { index: 1, success_rate: 37, label: 'fixture attempt 1' },
      { index: 2, success_rate: 52, label: 'fixture attempt 2' },
      { index: 3, success_rate: 67, label: 'fixture attempt 3' },
      { index: 4, success_rate: 78, label: 'fixture retest' },
    ],
  },
];
