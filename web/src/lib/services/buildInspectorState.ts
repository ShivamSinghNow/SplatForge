import type { FailureRecord, IntegrationStatus, RunSummary, SceneOption, TaskOption } from '../api/types';
import type { DataSource, SectionMeta } from '../types/dataSource';
import type {
  CouncilState,
  CurriculumState,
  InspectorViewModel,
  MissionState,
  PolicyVersion,
  ReplayMemoryState,
  RobotConfig,
  RobotPanelState,
  SystemHealthState,
  TaskConfig,
} from '../types/inspector';
import type { LoopStepId } from '../types/splatforge';
import { mapHonestIntegrations } from './integrationService';
import { INSPECTOR_CATALOG } from './inspectorCatalog';

const LOOP_LABELS: Record<LoopStepId, string> = {
  world: 'World',
  attempt: 'Attempt',
  critique: 'Critique',
  curriculum: 'Curriculum',
  train: 'Train',
  retest: 'Retest',
  improve: 'Improve',
};

const CRITIC_ROLES: Record<string, string> = {
  physics: 'Contact and dynamics check',
  gemini: 'Primary failure critic',
  vlm: 'Vision-language critique',
  minimax: 'Secondary critic',
  gemma: 'Triage and routing',
  monju: 'Final council decision',
};

function sectionMeta(source: DataSource, isDemo: boolean, label?: string): SectionMeta {
  return {
    source,
    isDemo,
    label: label ?? (isDemo ? 'Demo fixture' : source === 'api' ? 'Live API' : 'Unavailable'),
    lastUpdated: null,
  };
}

function nextActionForStep(step: LoopStepId, hasRun: boolean, loading: boolean, apiOnline: boolean): string {
  if (!apiOnline) {
    return 'Start the API server to run a live practice loop';
  }
  if (loading) {
    return 'Executing practice loop and streaming telemetry';
  }
  if (!hasRun) {
    return 'Configure task and run practice loop';
  }
  const actions: Record<LoopStepId, string> = {
    world: 'Review loaded scene and splat asset status',
    attempt: 'Inspect initial rollout in Rerun viewer',
    critique: 'Review council failure diagnosis from run data',
    curriculum: 'Review generated variants (training apply not wired yet)',
    train: 'Policy adapter updated via dry-run loop — no external trainer',
    retest: 'Compare retest trajectory in Rerun viewer',
    improve: 'Export report or run next mission',
  };
  return actions[step];
}

function robotTypeLabel(robotType: RobotConfig['robotType']): string {
  return INSPECTOR_CATALOG.robotTypes.find((item) => item.id === robotType)?.label ?? robotType;
}

function buildMission(
  activeRun: RunSummary | null,
  scene: SceneOption | undefined,
  task: TaskOption | undefined,
  robot: RobotConfig,
  currentStep: LoopStepId,
  loading: boolean,
  phase: string,
  source: DataSource,
  isDemo: boolean,
  apiOnline: boolean,
): MissionState {
  return {
    activeTask: task?.name ?? activeRun?.task ?? '—',
    activeWorld: scene?.name ?? activeRun?.scene ?? '—',
    robotTypeLabel: robotTypeLabel(robot.robotType),
    policyVersion: activeRun?.retest?.policy_version ?? activeRun?.initial_attempt.policy_version ?? '—',
    adapterVersion: activeRun?.retest?.policy_version ?? activeRun?.initial_attempt.policy_version ?? '—',
    currentLoopStep: currentStep,
    loopStepLabel: LOOP_LABELS[currentStep],
    nextAction: nextActionForStep(currentStep, Boolean(activeRun), loading, apiOnline),
    runId: activeRun?.run_id ?? null,
    phase,
    backend: activeRun?.backend ?? (apiOnline ? 'dry-run (default)' : '—'),
    meta: sectionMeta(source, isDemo),
  };
}

function criticSource(active: boolean, isDemo: boolean): DataSource {
  if (!active) {
    return 'unavailable';
  }
  return isDemo ? 'fixture' : 'api';
}

function buildCouncil(
  activeRun: RunSummary | null,
  integrations: IntegrationStatus[],
  source: DataSource,
  isDemo: boolean,
): CouncilState {
  const configured = new Map(integrations.map((item) => [item.id, item.configured]));
  const nameToId: Record<string, string> = {
    physics: 'physics',
    gemini: 'gemini',
    vlm: 'gemini',
    minimax: 'minimax',
    gemma: 'gemma',
    monju: 'monju',
  };

  const critics = (activeRun?.critics ?? []).map((critic) => {
    const id = nameToId[critic.name.toLowerCase()] ?? critic.name.toLowerCase();
    const integrationId = id === 'vlm' ? 'gemini' : id;
    return {
      id,
      name: critic.name,
      role: CRITIC_ROLES[critic.name.toLowerCase()] ?? 'Critic',
      active: critic.active,
      rootCause: critic.active ? critic.root_cause : critic.root_cause || 'Skipped for this run',
      evidence: critic.evidence,
      confidence: critic.confidence,
      configured: configured.get(integrationId) ?? id === 'physics',
      source: criticSource(critic.active, isDemo),
      hasOutput: critic.active && critic.confidence > 0,
    };
  });

  const activeConfidences = critics.filter((c) => c.hasOutput).map((c) => c.confidence);
  const overallConfidence = activeConfidences.length
    ? activeConfidences.reduce((sum, value) => sum + value, 0) / activeConfidences.length
    : 0;

  const causes = [...new Set(critics.filter((c) => c.hasOutput).map((c) => c.rootCause))];
  const disagreement =
    causes.length > 1 ? `Critics disagree: ${causes.slice(0, 2).join(' vs ')}` : 'No active disagreement';

  return {
    critics,
    consensusFailure: activeRun?.failure_cause ?? 'No critic results yet. Run an attempt to generate council feedback.',
    disagreementSummary: activeRun ? disagreement : 'Council idle — no run data',
    nextCurriculumSuggestion: activeRun?.variants[0]?.label ?? 'Generate variations after first failed attempt',
    overallConfidence,
    hasRunData: Boolean(activeRun?.critics.length),
    meta: sectionMeta(source, isDemo, activeRun ? (isDemo ? 'Demo fixture' : 'Run critics') : 'No data'),
  };
}

function buildCurriculum(activeRun: RunSummary | null, source: DataSource, isDemo: boolean): CurriculumState {
  const variations = (activeRun?.variants ?? []).map((variant, index) => ({
    id: `var_${index}`,
    label: variant.label,
    reason: variant.reason,
    difficulty: (['easy', 'medium', 'hard', 'adversarial'] as const)[index] ?? 'medium',
    failureFocus: activeRun?.failure_cause ?? 'general manipulation',
    selected: false,
    transformSummary: Object.entries(variant.transform)
      .slice(0, 3)
      .map(([key, value]) => `${key}=${value}`)
      .join(', '),
  }));

  return {
    variations,
    difficultyLadder: ['easy', 'medium', 'hard', 'adversarial'],
    failureFocus: activeRun?.failure_cause ?? 'none yet',
    canGenerateMore: false,
    canApply: false,
    trainingWired: false,
    meta: sectionMeta(source, isDemo, activeRun?.variants.length ? 'Run variants' : 'No data'),
  };
}

function buildMemory(
  activeRun: RunSummary | null,
  similarFailures: FailureRecord[],
  integrations: IntegrationStatus[],
  source: DataSource,
  isDemo: boolean,
  apiOnline: boolean,
): ReplayMemoryState {
  const mongo = integrations.find((item) => item.id === 'mongodb');
  const mongoConfigured = Boolean(mongo?.configured);
  const mongoStatus = !apiOnline ? 'offline' : mongoConfigured ? 'configured' : 'local';
  const mongoLabel = !apiOnline
    ? 'API offline — fixture memory only'
    : mongoConfigured
      ? 'MONGODB_URI set — connection not tested'
      : 'Local JSONL fallback (runs/*.jsonl)';

  const latestFailures: ReplayMemoryState['latestFailures'] =
    activeRun?.initial_attempt.status === 'failure'
      ? [
          {
            id: 'latest_fail',
            kind: 'failure',
            label: 'Latest attempt',
            summary: activeRun.initial_attempt.summary,
            episodeId: String(activeRun.initial_attempt.metrics.episode_id ?? activeRun.run_id),
            selected: true,
          },
        ]
      : [];

  const successfulTrajectories: ReplayMemoryState['successfulTrajectories'] =
    activeRun?.retest?.status === 'success'
      ? [
          {
            id: 'latest_success',
            kind: 'success',
            label: 'Retest trajectory',
            summary: activeRun.retest.summary,
            selected: true,
          },
        ]
      : [];

  const similar = similarFailures.map((record) => ({
    id: record.failure_id,
    kind: 'similar' as const,
    label: record.root_cause.slice(0, 40),
    summary: record.evidence.join('; ') || record.root_cause,
    episodeId: record.episode_id,
    selected: false,
  }));

  const similarSource: DataSource =
    similar.length > 0 ? (mongoConfigured ? 'mongodb' : 'api') : 'unavailable';

  return {
    latestFailures,
    successfulTrajectories,
    similarFailures: similar,
    selectedExamples: [...latestFailures, ...successfulTrajectories].filter((item) => item.selected),
    mongoStatus,
    mongoLabel,
    similarSource,
    meta: sectionMeta(similar.length ? similarSource : source, isDemo),
  };
}

function buildPolicy(
  activeRun: RunSummary | null,
  scores: { before: number; after: number },
  source: DataSource,
  isDemo: boolean,
): PolicyVersion {
  const before = activeRun?.initial_attempt.policy_version ?? '—';
  const after = activeRun?.retest?.policy_version ?? before;
  return {
    before,
    after,
    adapterVersion: after,
    scoreBefore: scores.before,
    scoreAfter: scores.after,
    improvementSummary: activeRun?.retest
      ? `Retest ${activeRun.retest.status} — ${activeRun.policy_changes.length} parameter updates from dry-run adapter`
      : 'Run loop to compute adapter delta',
    retestStatus: activeRun?.retest?.status ?? (activeRun ? 'pending' : 'none'),
    changes: (activeRun?.policy_changes ?? []).map((change) => ({
      parameter: change.parameter,
      before: change.before,
      after: change.after,
    })),
    trainingWired: false,
    meta: sectionMeta(source, isDemo, activeRun ? 'Run policy data' : 'No data'),
  };
}

function buildHealth(
  apiOnline: boolean,
  integrations: IntegrationStatus[],
  source: DataSource,
  isDemo: boolean,
): SystemHealthState {
  const honest = mapHonestIntegrations(integrations, source, apiOnline);
  return {
    integrations: honest.map((item) => ({
      id: item.id,
      label: item.label,
      configured: item.configured,
      status: item.connectionStatus,
      purpose: item.purpose,
      nextStep: item.nextStep,
      source: item.source,
      displayLabel: item.displayLabel,
    })),
    apiOnline,
    meta: sectionMeta(source, isDemo, apiOnline ? 'API health' : 'Offline'),
  };
}

export interface BuildInspectorInput {
  activeRun: RunSummary | null;
  scenes: SceneOption[];
  tasks: TaskOption[];
  selectedScene: string;
  selectedTask: string;
  robot: RobotConfig;
  task: TaskConfig;
  currentStep: LoopStepId;
  loading: boolean;
  phase: string;
  apiOnline: boolean;
  integrations: IntegrationStatus[];
  similarFailures: FailureRecord[];
  scores: { before: number; after: number };
  dataSource: DataSource;
  isDemo: boolean;
}

export function buildInspectorViewModel(input: BuildInspectorInput): InspectorViewModel {
  const scene = input.scenes.find((item) => item.id === input.selectedScene);
  const taskMeta = input.tasks.find((item) => item.id === input.selectedTask);
  const { dataSource, isDemo } = input;

  const robotPanel: RobotPanelState = {
    ...input.robot,
    wiredToRun: false,
    wiredToRender: false,
    meta: sectionMeta('local', false, 'Local only — not sent to POST /runs'),
  };

  return {
    mission: buildMission(
      input.activeRun,
      scene,
      taskMeta,
      input.robot,
      input.currentStep,
      input.loading,
      input.phase,
      dataSource,
      isDemo,
      input.apiOnline,
    ),
    robot: robotPanel,
    task: {
      ...input.task,
      meta: sectionMeta('local', false, 'Local task config — not sent to POST /runs yet'),
    },
    council: buildCouncil(input.activeRun, input.integrations, dataSource, isDemo),
    curriculum: buildCurriculum(input.activeRun, dataSource, isDemo),
    memory: buildMemory(
      input.activeRun,
      input.similarFailures,
      input.integrations,
      dataSource,
      isDemo,
      input.apiOnline,
    ),
    policy: buildPolicy(input.activeRun, input.scores, dataSource, isDemo),
    health: buildHealth(input.apiOnline, input.integrations, dataSource, isDemo),
    catalog: INSPECTOR_CATALOG,
  };
}

export function defaultRobotConfig(): RobotConfig {
  return {
    robotType: 'table_arm',
    gripperType: 'parallel_jaw',
    status: 'idle',
    pose: { x: -0.42, y: 0.38, z: -0.12, roll: 0, pitch: -0.55, yaw: 0.35 },
    currentAction: 'awaiting command',
    controlMode: 'autonomous',
    safetyMode: 'standard',
    maxSpeed: 0.8,
    approachHeight: 0.14,
    gripperWidth: 0.06,
  };
}

export function defaultTaskConfig(sceneId: string, taskId: string, description = ''): TaskConfig {
  return {
    instruction: description,
    taskType: 'pick_object',
    targetObject: 'mug',
    successCondition: 'Object in goal zone with stable grasp',
    difficulty: 'medium',
    constraints: ['no unsafe collision', 'stay inside workspace'],
    sceneId,
    taskId,
  };
}
