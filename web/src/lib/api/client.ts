import type {
  FailureRecord,
  IntegrationStatus,
  RunSummary,
  SceneOption,
  SuccessRateSeries,
  TaskOption,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export type { SuccessRatePoint, SuccessRateSeries } from './types';

export function fetchHealth() {
  return request<{ status: string }>('/health');
}

export function fetchScenes() {
  return request<{ scenes: SceneOption[] }>('/scenes');
}

export function fetchTasks() {
  return request<{ tasks: TaskOption[] }>('/tasks');
}

export function fetchIntegrations() {
  return request<{ integrations: IntegrationStatus[] }>('/integrations');
}

export function fetchRuns() {
  return request<{ runs: RunSummary[] }>('/runs');
}

export function fetchRun(runId: string) {
  return request<RunSummary>(`/runs/${runId}`);
}

export function fetchSuccessRate(live = false) {
  return request<SuccessRateSeries>(live ? '/metrics/success-rate/live' : '/metrics/success-rate');
}

export function fetchSimilarFailures(query: string, limit = 5) {
  return request<{ query: string; results: FailureRecord[] }>(
    `/failures/similar?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
}

export function createRun(scene: string, task: string, backend = 'dry-run') {
  return request<RunSummary>('/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene, task, backend, max_variants: 3 }),
  });
}
