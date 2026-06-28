export interface EpisodeCard {
  status: 'success' | 'failure';
  policy_version: string;
  summary: string;
  metrics: Record<string, number | string | boolean>;
}

export interface VariantCard {
  label: string;
  reason: string;
  transform: Record<string, number | string | boolean>;
}

export interface PolicyChange {
  parameter: string;
  before: number;
  after: number;
}

export interface CriticCard {
  name: string;
  active: boolean;
  root_cause: string;
  evidence: string[];
  confidence: number;
}

export interface RunSummary {
  run_id: string;
  scene: string;
  task: string;
  backend: string;
  phase: string;
  timeline: string[];
  initial_attempt: EpisodeCard;
  failure_cause: string | null;
  evidence: string[];
  critics: CriticCard[];
  variants: VariantCard[];
  policy_changes: PolicyChange[];
  retest: EpisodeCard | null;
  log_collections: string[];
}

export interface SceneOption {
  id: string;
  name: string;
  path: string;
}

export interface TaskOption {
  id: string;
  name: string;
  description: string;
}

export interface IntegrationStatus {
  id: string;
  label: string;
  configured: boolean;
  purpose: string;
  next_step: string;
}

export interface SuccessRatePoint {
  index: number;
  success_rate: number;
  episode_id?: string | null;
  label?: string;
}

export interface SuccessRateSeries {
  points: SuccessRatePoint[];
  current_rate: number;
  source: string;
}

export interface FailureRecord {
  failure_id: string;
  episode_id: string;
  root_cause: string;
  evidence: string[];
  suggested_variants: string[];
}
