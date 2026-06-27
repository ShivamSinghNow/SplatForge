const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchHealth() {
  return request<{ status: string }>('/health');
}

export function fetchSuccessRate(live = false) {
  return request<SuccessRateSeries>(live ? '/metrics/success-rate/live' : '/metrics/success-rate');
}

export function createRun(scene: string, task: string, backend = 'dry-run') {
  return request<{ run_id: string; phase: string }>('/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene, task, backend, max_variants: 3 }),
  });
}
