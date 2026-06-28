import type { IntegrationStatus } from '../api/types';
import type { AppMode, DataSource } from '../types/dataSource';

export interface AppModeContext {
  apiOnline: boolean;
  usingFixtures: boolean;
  integrations: IntegrationStatus[];
}

export function resolveDataSource(ctx: AppModeContext): DataSource {
  if (ctx.usingFixtures || !ctx.apiOnline) {
    return 'fixture';
  }
  return 'api';
}

export function resolveAppMode(ctx: AppModeContext): AppMode {
  if (ctx.usingFixtures || !ctx.apiOnline) {
    return 'demo';
  }

  const configuredCount = ctx.integrations.filter((item) => item.configured).length;
  const hasRerun = ctx.integrations.some((item) => item.id === 'rerun' && item.configured);
  const hasGemini = ctx.integrations.some((item) => item.id === 'gemini' && item.configured);

  if (hasRerun && hasGemini && configuredCount >= 3) {
    return 'connected';
  }

  const anyMissing = ctx.integrations.some(
    (item) => ['gemini', 'mongodb', 'rerun'].includes(item.id) && !item.configured,
  );
  if (anyMissing) {
    return 'missing_config';
  }

  return 'local';
}

export function appModeLabel(mode: AppMode): string {
  switch (mode) {
    case 'demo':
      return 'Demo Mode';
    case 'local':
      return 'Local Mode';
    case 'connected':
      return 'Connected Mode';
    case 'missing_config':
      return 'Missing Configuration';
  }
}

export function appModeDescription(mode: AppMode, source: DataSource): string {
  switch (mode) {
    case 'demo':
      return 'Using local fixture data — start the API for live runs.';
    case 'local':
      return source === 'api' ? 'Backend reachable — dry-run simulation active.' : 'Local backend with fixture fallback.';
    case 'connected':
      return 'Backend reachable with key integrations configured.';
    case 'missing_config':
      return 'Backend reachable — add env vars for live critics and memory.';
  }
}
