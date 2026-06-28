const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface RerunRecordingMetadata {
  run_id: string;
  exists: boolean;
  path?: string | null;
  viewer_url?: string | null;
  download_url?: string | null;
  file_url?: string | null;
  generated_at?: string | null;
  sdk_version: string;
  viewer_mode: 'embedded' | 'iframe' | 'external' | string;
  frame_count: number;
  jump_frames: Record<string, number>;
  score_before: number;
  score_after: number;
  scene?: string | null;
  task?: string | null;
}

export interface RerunHealth {
  sdk_installed: boolean;
  sdk_version: string;
  viewer_mode: string;
  output_path: string;
  recordings_count: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchRerunHealth() {
  return request<RerunHealth>('/rerun/health');
}

export function fetchRerunMetadata(runId: string) {
  return request<RerunRecordingMetadata>(`/runs/${runId}/rerun`);
}

export function generateRerunRecording(runId: string) {
  return request<RerunRecordingMetadata>(`/runs/${runId}/rerun/generate`, { method: 'POST' });
}

export function testRerunRecording() {
  return request<RerunRecordingMetadata>('/rerun/test-recording', { method: 'POST' });
}

export function rerunFileUrl(runId: string, metadata?: RerunRecordingMetadata | null) {
  if (metadata?.file_url) {
    return metadata.file_url.replace('http://127.0.0.1:8000', '/api').replace('http://localhost:8000', '/api');
  }
  return `${API_BASE}/rerun/files/${runId}.rrd`;
}

export function rerunDownloadUrl(runId: string) {
  return `${API_BASE}/runs/${runId}/rerun/download`;
}

export function rerunViewerIframeUrl(runId: string, sdkVersion: string, fileUrl: string) {
  const absolute = fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`;
  return `https://app.rerun.io/version/${sdkVersion}/index.html?url=${encodeURIComponent(absolute)}`;
}
