export type DataSource =
  | 'fixture'
  | 'api'
  | 'mongodb'
  | 'gemini'
  | 'minimax'
  | 'monju'
  | 'rerun'
  | 'local'
  | 'unavailable';

export type AppMode = 'demo' | 'local' | 'connected' | 'missing_config';

export type IntegrationConnectionStatus =
  | 'configured'
  | 'missing_config'
  | 'not_tested'
  | 'not_wired'
  | 'offline';

export interface TrackedData<T> {
  value: T;
  source: DataSource;
  isDemo: boolean;
  isConnected: boolean;
  lastUpdated: string | null;
}

export interface SectionMeta {
  source: DataSource;
  isDemo: boolean;
  label: string;
  lastUpdated: string | null;
}

export interface HonestIntegration {
  id: string;
  label: string;
  configured: boolean;
  purpose: string;
  nextStep: string;
  source: DataSource;
  connectionStatus: IntegrationConnectionStatus;
  displayLabel: string;
  isConnected: boolean;
  lastUpdated: string | null;
}
