import type { RunSummary, SuccessRateSeries } from '../api/types';

/** Static overnight demo run — used for rehearsable demo when API is offline. */
export const DEMO_RUN: RunSummary = {
  run_id: 'overnight_run_fixture',
  scene: 'scene_mug_table',
  task: 'pick_mug',
  backend: 'dry-run',
  phase: 'retest_success',
  timeline: ['Attempt', 'Critique', 'Variants', 'Policy Update', 'Retest'],
  initial_attempt: {
    status: 'failure',
    policy_version: 'policy_v0',
    summary: 'Failed with 9.0cm approach error and 0 stable contacts.',
    metrics: {
      gripper_height_error_m: 0.09,
      contact_count: 0,
      slip_velocity_mps: 0,
      handle_occluded: true,
      unsafe_collision: false,
    },
  },
  failure_cause: 'Gripper approach height error was 0.090m.',
  evidence: [
    'Gripper approach height error was 0.090m.',
    'Only 0 gripper contacts were detected.',
    'Handle was occluded from the primary camera.',
  ],
  critics: [
    {
      name: 'physics',
      active: true,
      root_cause: 'Gripper approach height error was 0.090m.',
      evidence: ['height error 0.09m', '0 contacts'],
      confidence: 0.9,
    },
    {
      name: 'gemini',
      active: false,
      root_cause: 'Skipped — GEMINI_API_KEY not set.',
      evidence: [],
      confidence: 0,
    },
    {
      name: 'vlm',
      active: true,
      root_cause: 'Visual grasp alignment uncertain.',
      evidence: ['handle partially occluded'],
      confidence: 0.2,
    },
  ],
  variants: [
    {
      label: 'lower_approach_height',
      reason: 'Reduce approach height to improve contact.',
      transform: { approach_height_m_delta: -0.04 },
    },
    {
      label: 'rotate_object_for_clearer_grasp',
      reason: 'Rotate mug for clearer handle access.',
      transform: { yaw_deg_delta: 30 },
    },
  ],
  policy_changes: [
    { parameter: 'approach_height_m', before: 0.14, after: 0.1 },
    { parameter: 'gripper_width_m', before: 0.06, after: 0.07 },
  ],
  retest: {
    status: 'success',
    policy_version: 'policy_v1',
    summary: 'Object reached the goal with stable contact.',
    metrics: {
      gripper_height_error_m: 0.01,
      contact_count: 2,
      handle_occluded: false,
      unsafe_collision: false,
    },
  },
  log_collections: ['scans', 'episodes', 'critiques', 'variants', 'policy_versions'],
};

export const DEMO_RUNS: RunSummary[] = [DEMO_RUN];

export const DEMO_SUCCESS_RATE: SuccessRateSeries = {
  points: [
    { index: 1, success_rate: 37, label: 'overnight attempt 1' },
    { index: 2, success_rate: 52, label: 'overnight attempt 2' },
    { index: 3, success_rate: 67, label: 'overnight attempt 3' },
    { index: 4, success_rate: 78, label: 'overnight retest' },
  ],
  current_rate: 78,
  source: 'fixture',
};

export const DEMO_INTEGRATIONS = [
  {
    id: 'rerun',
    label: 'Rerun',
    configured: false,
    purpose: '3D replay and telemetry visualization.',
    next_step: 'Install rerun-sdk and start the API.',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    configured: false,
    purpose: 'Primary VLM failure critic.',
    next_step: 'Set GEMINI_API_KEY in .env.',
  },
  {
    id: 'mongodb',
    label: 'MongoDB',
    configured: false,
    purpose: 'Cloud episode and failure memory.',
    next_step: 'Set MONGODB_URI in .env.',
  },
] as const;
