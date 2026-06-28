import type { IntegrationStatus } from '../api/types';
import type { DataSource, HonestIntegration, IntegrationConnectionStatus } from '../types/dataSource';

const NOT_WIRED_IDS = new Set(['livekit', 'modular_scorer', 'gemma', 'monju']);

function connectionStatus(integration: IntegrationStatus, source: DataSource): IntegrationConnectionStatus {
  if (NOT_WIRED_IDS.has(integration.id)) {
    return 'not_wired';
  }
  if (!integration.configured) {
    return 'missing_config';
  }
  return 'not_tested';
}

function displayLabel(status: IntegrationConnectionStatus): string {
  switch (status) {
    case 'configured':
      return 'env configured';
    case 'missing_config':
      return 'missing config';
    case 'not_tested':
      return 'not tested';
    case 'not_wired':
      return 'not wired';
    case 'offline':
      return 'offline';
  }
}

export function mapHonestIntegration(
  integration: IntegrationStatus,
  source: DataSource,
  apiOnline: boolean,
): HonestIntegration {
  const status = apiOnline ? connectionStatus(integration, source) : 'offline';
  return {
    id: integration.id,
    label: integration.label,
    configured: integration.configured,
    purpose: integration.purpose,
    nextStep: integration.next_step,
    source,
    connectionStatus: status,
    displayLabel: displayLabel(status),
    isConnected: false,
    lastUpdated: null,
  };
}

export function mapHonestIntegrations(
  integrations: IntegrationStatus[],
  source: DataSource,
  apiOnline: boolean,
): HonestIntegration[] {
  return integrations.map((item) => mapHonestIntegration(item, source, apiOnline));
}
