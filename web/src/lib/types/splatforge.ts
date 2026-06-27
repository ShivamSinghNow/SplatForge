export type LoopStepId =
  | 'world'
  | 'attempt'
  | 'critique'
  | 'curriculum'
  | 'train'
  | 'retest'
  | 'improve';

export type StepStatus = 'pending' | 'active' | 'complete' | 'failed';

export type IntegrationMode = 'connected' | 'local' | 'demo' | 'missing' | 'disabled';

export type WorldObjectType = 'table' | 'mug' | 'bowl' | 'block' | 'zone' | 'robot';

export interface WorldObject {
  id: string;
  type: WorldObjectType;
  label: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  state?: 'target' | 'occluded' | 'stable' | 'failure' | 'success';
}

export interface TrainingWorld {
  id: string;
  name: string;
  description: string;
  sourceType: 'splat' | 'scan' | 'placeholder';
  assetUrl?: string;
  objects: WorldObject[];
  tasks: TrainingTask[];
  variationsCount: number;
  lastScore: number;
  status: 'ready' | 'training' | 'needs_scan' | 'error';
}

export interface TrainingTask {
  id: string;
  worldId: string;
  instruction: string;
  targetObject: string;
  successCondition: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'adversarial';
}

export interface FailureCluster {
  id: string;
  label: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

export interface TrainingRun {
  id: string;
  worldId: string;
  taskId: string;
  status: 'idle' | 'running' | 'complete' | 'failed';
  loopStep: LoopStepId;
  policyBefore: string;
  policyAfter: string;
  adapterVersion: string;
  scoreBefore: number;
  scoreAfter: number;
  rolloutCount: number;
  failureClusters: FailureCluster[];
  createdAt: string;
  trajectory: [number, number, number][];
}

export interface CriticResult {
  id: string;
  runId: string;
  criticName: 'Gemini' | 'MiniMax' | 'Gemma' | 'Physics' | 'Monju';
  score: number;
  success: boolean;
  failureType: string;
  rootCause: string;
  evidence: string;
  suggestion: string;
}

export interface CouncilDecision {
  id: string;
  runId: string;
  consensusFailure: string;
  selectedCurriculum: string;
  reasoning: string;
  confidence: number;
}

export interface PolicyVersion {
  id: string;
  name: string;
  adapter: string;
  trainedOn: string;
  score: number;
  improvementSummary: string;
}

export interface IntegrationStatus {
  name: string;
  status: IntegrationMode;
  description: string;
  requiredEnvVars: string[];
  mode: string;
}

export interface LoopStep {
  id: LoopStepId;
  label: string;
  detail: string;
  status: StepStatus;
}

export interface CommandExample {
  id: string;
  label: string;
}
