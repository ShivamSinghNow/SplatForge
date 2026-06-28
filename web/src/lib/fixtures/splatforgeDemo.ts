import type {
  CommandExample,
  CouncilDecision,
  CriticResult,
  IntegrationStatus,
  LoopStep,
  PolicyVersion,
  TrainingRun,
  TrainingWorld,
} from '../types/splatforge';

export const demoWorlds: TrainingWorld[] = [
  {
    id: 'world_tabletop_mug',
    name: 'Tabletop Mug World',
    description: 'Reconstructed tabletop scan with a mug, bowl, clutter block, robot gripper, and target zone.',
    sourceType: 'placeholder',
    variationsCount: 24,
    lastScore: 41,
    status: 'ready',
    objects: [
      {
        id: 'table_01',
        type: 'table',
        label: 'reconstructed table',
        position: [0, -0.06, 0],
        scale: [2.8, 0.12, 1.75],
        state: 'stable',
      },
      {
        id: 'mug_01',
        type: 'mug',
        label: 'target mug',
        position: [0.55, 0.18, -0.1],
        rotation: [0, 0.45, 0],
        scale: [1, 1, 1],
        state: 'target',
      },
      {
        id: 'bowl_01',
        type: 'bowl',
        label: 'occluding bowl',
        position: [0.18, 0.1, 0.28],
        scale: [1, 0.5, 1],
        state: 'occluded',
      },
      {
        id: 'block_01',
        type: 'block',
        label: 'clutter block',
        position: [-0.22, 0.08, -0.34],
        rotation: [0, 0.28, 0],
        scale: [0.28, 0.16, 0.22],
        state: 'stable',
      },
      {
        id: 'target_zone_a',
        type: 'zone',
        label: 'target zone',
        position: [0.92, 0.02, 0.38],
        scale: [0.42, 0.02, 0.32],
        state: 'success',
      },
    ],
    tasks: [
      {
        id: 'task_hidden_handle_pick',
        worldId: 'world_tabletop_mug',
        instruction: 'Pick up the mug even when the handle is partially hidden by clutter.',
        targetObject: 'mug_01',
        successCondition: 'Lift mug and place it inside target_zone_a without slip.',
        difficulty: 'hard',
      },
      {
        id: 'task_recover_grasp',
        worldId: 'world_tabletop_mug',
        instruction: 'Recover from a failed first grasp and re-approach from a lower angle.',
        targetObject: 'mug_01',
        successCondition: 'Second grasp succeeds after initial contact failure.',
        difficulty: 'adversarial',
      },
    ],
  },
  {
    id: 'world_block_bowl_clutter',
    name: 'Bowl and Block Clutter',
    description: 'Dense tabletop variation used to test occlusion and collision-aware grasp planning.',
    sourceType: 'placeholder',
    variationsCount: 16,
    lastScore: 28,
    status: 'training',
    objects: [],
    tasks: [],
  },
];

export const demoTrainingRuns: TrainingRun[] = [
  {
    id: 'run_hidden_handle_042',
    worldId: 'world_tabletop_mug',
    taskId: 'task_hidden_handle_pick',
    status: 'running',
    loopStep: 'critique',
    policyBefore: 'policy_v0',
    policyAfter: 'adapter_v2',
    adapterVersion: 'adapter_v2_hidden_handle',
    scoreBefore: 37,
    scoreAfter: 78,
    rolloutCount: 46,
    createdAt: '2026-06-27T19:32:00Z',
    trajectory: [
      [-0.52, 0.92, -0.2],
      [-0.28, 0.82, -0.16],
      [0.04, 0.7, -0.12],
      [0.32, 0.46, -0.1],
      [0.53, 0.27, -0.1],
      [0.78, 0.34, 0.14],
      [0.94, 0.28, 0.36],
    ],
    failureClusters: [
      { id: 'cluster_handle_occlusion', label: 'Handle occlusion', count: 13, severity: 'high' },
      { id: 'cluster_steep_approach', label: 'Steep approach angle', count: 9, severity: 'medium' },
      { id: 'cluster_slip', label: 'Late lift slip', count: 4, severity: 'medium' },
    ],
  },
];

export const demoCriticResults: CriticResult[] = [
  {
    id: 'critic_gemini_01',
    runId: 'run_hidden_handle_042',
    criticName: 'Gemini',
    score: 0.82,
    success: false,
    failureType: 'occluded_handle',
    rootCause: 'The gripper approached from above while the handle was hidden behind the bowl.',
    evidence: 'Rollout frames 118-142 show contact on the mug body instead of the handle.',
    suggestion: 'Generate hidden-handle variations and lower lateral approach rollouts.',
  },
  {
    id: 'critic_minimax_01',
    runId: 'run_hidden_handle_042',
    criticName: 'MiniMax',
    score: 0.74,
    success: false,
    failureType: 'bad_approach_vector',
    rootCause: 'The motion plan did not adapt after first contact displaced the mug.',
    evidence: 'Trajectory deviation increases after contact, but the policy keeps the original path.',
    suggestion: 'Train recovery attempts with mid-rollout re-planning.',
  },
  {
    id: 'critic_physics_01',
    runId: 'run_hidden_handle_042',
    criticName: 'Physics',
    score: 0.68,
    success: false,
    failureType: 'slip_risk',
    rootCause: 'Contact normal and lift vector created unstable torque at lift.',
    evidence: 'Slip threshold exceeded during lift window.',
    suggestion: 'Favor grasp points with lower torque around the mug center of mass.',
  },
  {
    id: 'critic_monju_01',
    runId: 'run_hidden_handle_042',
    criticName: 'Monju',
    score: 0.88,
    success: false,
    failureType: 'curriculum_required',
    rootCause: 'The policy needs a targeted curriculum, not only a single parameter update.',
    evidence: 'Critics agree on occlusion, approach angle, and recovery gaps.',
    suggestion: 'Prioritize hidden-handle worlds, then retest the original failed scene.',
  },
];

export const demoCouncilDecision: CouncilDecision = {
  id: 'council_042',
  runId: 'run_hidden_handle_042',
  consensusFailure: 'Hidden handle plus steep approach caused unstable body contact.',
  selectedCurriculum: '24 generated worlds: rotated mugs, blocked handles, lower camera angles, and recovery rollouts.',
  reasoning: 'The council selected variations that isolate the failure cause while preserving the original task.',
  confidence: 0.86,
};

export const demoPolicies: PolicyVersion[] = [
  {
    id: 'policy_v0',
    name: 'policy_v0',
    adapter: 'baseline_grasp',
    trainedOn: 'initial dry-run rollouts',
    score: 37,
    improvementSummary: 'Fails hidden-handle mug pickup.',
  },
  {
    id: 'adapter_v1',
    name: 'adapter_v1',
    adapter: 'lower_lateral_grasp',
    trainedOn: '12 hidden-handle variants',
    score: 61,
    improvementSummary: 'Improves approach angle but still slips on lift.',
  },
  {
    id: 'adapter_v2',
    name: 'adapter_v2',
    adapter: 'hidden_handle_recovery',
    trainedOn: '46 rollouts and 18 successful trajectories',
    score: 78,
    improvementSummary: 'Retests the original failure with a stable recovery grasp.',
  },
];

export const demoIntegrations: IntegrationStatus[] = [
  {
    name: 'Gemini',
    status: 'connected',
    description: 'Primary multimodal failure critic and curriculum planner.',
    requiredEnvVars: ['GEMINI_API_KEY'],
    mode: 'AI council',
  },
  {
    name: 'MiniMax',
    status: 'missing',
    description: 'Second critic for disagreement and multimodal variant suggestions.',
    requiredEnvVars: ['MINIMAX_API_KEY'],
    mode: 'optional critic',
  },
  {
    name: 'MongoDB',
    status: 'local',
    description: 'Replay memory is using local JSONL until Atlas is configured.',
    requiredEnvVars: ['MONGODB_URI'],
    mode: 'replay memory',
  },
  {
    name: 'LiveKit',
    status: 'disabled',
    description: 'Voice/video command channel placeholder.',
    requiredEnvVars: ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'],
    mode: 'voice command',
  },
  {
    name: 'DigitalOcean',
    status: 'missing',
    description: 'H100 droplet is not fact-verified until the droplet ID and H100 GPU type are configured.',
    requiredEnvVars: ['DIGITALOCEAN_H100_DROPLET_ID', 'DIGITALOCEAN_GPU_TYPE'],
    mode: 'H100 GPU worker',
  },
  {
    name: 'Splat Asset',
    status: 'missing',
    description: 'The tabletop scene still points at a placeholder .splat path until a real export exists.',
    requiredEnvVars: [],
    mode: 'scene fact gate',
  },
  {
    name: 'Modular',
    status: 'disabled',
    description: 'Fast scorer and local model runtime placeholder.',
    requiredEnvVars: ['MODULAR_SCORER_URL'],
    mode: 'fast scoring',
  },
  {
    name: 'Gemma',
    status: 'disabled',
    description: 'Local triage model for cheap first-pass failure grouping.',
    requiredEnvVars: ['GEMMA_ENDPOINT'],
    mode: 'local triage',
  },
  {
    name: 'Monju',
    status: 'missing',
    description: 'Final council decision layer.',
    requiredEnvVars: ['MONJU_ENDPOINT'],
    mode: 'council arbiter',
  },
];

export const loopStepCopy: Record<LoopStep['id'], Omit<LoopStep, 'id' | 'status'>> = {
  world: {
    label: 'World',
    detail: 'Load reconstructed scene',
  },
  attempt: {
    label: 'Attempt',
    detail: 'Run policy rollout',
  },
  critique: {
    label: 'Critique',
    detail: 'AI council finds root cause',
  },
  curriculum: {
    label: 'Curriculum',
    detail: 'Generate harder worlds',
  },
  train: {
    label: 'Train',
    detail: 'Update adapter',
  },
  retest: {
    label: 'Retest',
    detail: 'Replay original failure',
  },
  improve: {
    label: 'Improve',
    detail: 'Verify score delta',
  },
};

export const commandExamples: CommandExample[] = [
  { id: 'recover_grasp', label: 'Teach the robot to recover from a failed grasp.' },
  { id: 'harder_variations', label: 'Generate harder mug pickup variations.' },
  { id: 'retest_original', label: 'Retest the original failed case.' },
  { id: 'train_successes', label: 'Train on successful trajectories from this scene.' },
  { id: 'explain_council', label: 'Explain what the AI council thinks went wrong.' },
];

// Real GR00T N1.7 inference + open-loop eval run on the L40S droplet
// (see groot/run_inference.py, groot/eval_open_loop.py, groot/eval_result.json).
export const grootInference = {
  model: 'GR00T N1.7 (3B)',
  modelId: 'nvidia/GR00T-N1.7-3B',
  params: '3.14B',
  gpu: 'NVIDIA L40S (48GB)',
  embodiment: 'OXE DROID (7-DoF)',
  instruction: 'pick up the can',
  horizon: 40,
  actionHeads: [
    { key: 'eef_9d', label: 'End-effector pose', shape: '1 × 40 × 9' },
    { key: 'gripper_position', label: 'Gripper', shape: '1 × 40 × 1' },
    { key: 'joint_position', label: 'Joint targets', shape: '1 × 40 × 7' },
  ],
  evalMse: 0.03,
  evalMae: 0.119,
  evalPlot: '/groot_eval_plot.png',
  status: 'Inference verified · open-loop MSE 0.030',
};
