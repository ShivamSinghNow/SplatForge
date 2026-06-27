import type { LoopStepId } from './splatforge';

export type InspectorSectionId =
  | 'mission'
  | 'robot'
  | 'task'
  | 'council'
  | 'curriculum'
  | 'memory'
  | 'policy'
  | 'health';

export type RobotType =
  | 'table_arm'
  | 'mobile_manipulator'
  | 'warehouse_picker'
  | 'drone_inspection'
  | 'humanoid_upper'
  | 'rover_arm'
  | 'custom';

export type GripperType = 'parallel_jaw' | 'vacuum' | 'soft_gripper' | 'magnetic' | 'tool_changer';

export type ControlMode = 'autonomous' | 'teleop' | 'assisted' | 'replay';

export type SafetyMode = 'strict' | 'standard' | 'research';

export type TaskType =
  | 'pick_object'
  | 'move_to_target'
  | 'stack_blocks'
  | 'open_drawer'
  | 'inspect_object'
  | 'sort_objects'
  | 'recover_grasp'
  | 'navigate_target'
  | 'avoid_obstacle'
  | 'scan_environment'
  | 'assemble_object';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'adversarial';

export interface RobotConfig {
  robotType: RobotType;
  gripperType: GripperType;
  status: 'idle' | 'moving' | 'grasping' | 'error' | 'planning';
  pose: { x: number; y: number; z: number; roll: number; pitch: number; yaw: number };
  currentAction: string;
  controlMode: ControlMode;
  safetyMode: SafetyMode;
  maxSpeed: number;
  approachHeight: number;
  gripperWidth: number;
}

export interface TaskConfig {
  instruction: string;
  taskType: TaskType;
  targetObject: string;
  successCondition: string;
  difficulty: Difficulty;
  constraints: string[];
  sceneId: string;
  taskId: string;
}

export interface MissionState {
  activeTask: string;
  activeWorld: string;
  robotTypeLabel: string;
  policyVersion: string;
  adapterVersion: string;
  currentLoopStep: LoopStepId;
  loopStepLabel: string;
  nextAction: string;
  runId: string | null;
  phase: string;
  backend: string;
  meta: import('./dataSource').SectionMeta;
}

export interface RobotPanelState extends RobotConfig {
  meta: import('./dataSource').SectionMeta;
  wiredToRun: boolean;
  wiredToRender: boolean;
}

export interface CriticResult {
  id: string;
  name: string;
  role: string;
  active: boolean;
  rootCause: string;
  evidence: string[];
  confidence: number;
  configured: boolean;
  source: import('./dataSource').DataSource;
  hasOutput: boolean;
}

export interface CouncilState {
  critics: CriticResult[];
  consensusFailure: string;
  disagreementSummary: string;
  nextCurriculumSuggestion: string;
  overallConfidence: number;
  hasRunData: boolean;
  meta: import('./dataSource').SectionMeta;
}

export interface CurriculumVariation {
  id: string;
  label: string;
  reason: string;
  difficulty: Difficulty;
  failureFocus: string;
  selected: boolean;
  transformSummary: string;
}

export interface CurriculumState {
  variations: CurriculumVariation[];
  difficultyLadder: string[];
  failureFocus: string;
  canGenerateMore: boolean;
  canApply: boolean;
  trainingWired: boolean;
  meta: import('./dataSource').SectionMeta;
}

export interface ReplayMemoryItem {
  id: string;
  kind: 'failure' | 'success' | 'similar';
  label: string;
  summary: string;
  episodeId?: string;
  selected: boolean;
}

export interface ReplayMemoryState {
  latestFailures: ReplayMemoryItem[];
  successfulTrajectories: ReplayMemoryItem[];
  similarFailures: ReplayMemoryItem[];
  selectedExamples: ReplayMemoryItem[];
  mongoStatus: 'configured' | 'local' | 'offline';
  mongoLabel: string;
  similarSource: import('./dataSource').DataSource;
  meta: import('./dataSource').SectionMeta;
}

export interface PolicyVersion {
  before: string;
  after: string;
  adapterVersion: string;
  scoreBefore: number;
  scoreAfter: number;
  improvementSummary: string;
  retestStatus: 'success' | 'failure' | 'pending' | 'none';
  changes: Array<{ parameter: string; before: number; after: number }>;
  trainingWired: boolean;
  meta: import('./dataSource').SectionMeta;
}

export interface SystemIntegration {
  id: string;
  label: string;
  configured: boolean;
  status: 'configured' | 'missing_config' | 'not_tested' | 'not_wired' | 'offline';
  purpose: string;
  nextStep: string;
  source: import('./dataSource').DataSource;
  displayLabel: string;
}

export interface SystemHealthState {
  integrations: SystemIntegration[];
  apiOnline: boolean;
  meta: import('./dataSource').SectionMeta;
}

export interface InspectorCatalog {
  robotTypes: Array<{ id: RobotType; label: string; description: string }>;
  gripperTypes: Array<{ id: GripperType; label: string }>;
  taskTypes: Array<{ id: TaskType; label: string; description: string }>;
  taskExamples: Array<{ id: string; label: string; taskType: TaskType }>;
  targetObjects: string[];
  difficulties: Difficulty[];
  controlModes: ControlMode[];
  safetyModes: SafetyMode[];
}

export interface InspectorViewModel {
  mission: MissionState;
  robot: RobotPanelState;
  task: TaskConfig & { meta: import('./dataSource').SectionMeta };
  council: CouncilState;
  curriculum: CurriculumState;
  memory: ReplayMemoryState;
  policy: PolicyVersion;
  health: SystemHealthState;
  catalog: InspectorCatalog;
}
