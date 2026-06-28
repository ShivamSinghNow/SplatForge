import { useMemo } from 'react';
import type { IntegrationStatus } from '../lib/api/types';
import {
  appModeDescription,
  appModeLabel,
  resolveAppMode,
  resolveDataSource,
  type AppModeContext,
} from '../lib/services/appModeService';
import { mapHonestIntegrations } from '../lib/services/integrationService';
import type { AppMode, DataSource } from '../lib/types/dataSource';

export function useAppMode(input: {
  apiOnline: boolean;
  usingFixtures: boolean;
  integrations: IntegrationStatus[];
}) {
  return useMemo(() => {
    const ctx: AppModeContext = {
      apiOnline: input.apiOnline,
      usingFixtures: input.usingFixtures,
      integrations: input.integrations,
    };
    const mode: AppMode = resolveAppMode(ctx);
    const dataSource: DataSource = resolveDataSource(ctx);
    const honestIntegrations = mapHonestIntegrations(input.integrations, dataSource, input.apiOnline);

    return {
      mode,
      dataSource,
      modeLabel: appModeLabel(mode),
      modeDescription: appModeDescription(mode, dataSource),
      isDemo: mode === 'demo',
      honestIntegrations,
    };
  }, [input.apiOnline, input.usingFixtures, input.integrations]);
}
