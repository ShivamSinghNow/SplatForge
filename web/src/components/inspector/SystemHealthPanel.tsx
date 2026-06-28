import type { RerunHealth } from '../../lib/api/rerun';
import type { SystemHealthState } from '../../lib/types/inspector';
import { SectionSourceBar } from '../shared/DataHonesty';
import { InspectorBadge, InspectorCard, InspectorField, InspectorListItem } from './shared';

export function SystemHealthPanel({
  health,
  rerunHealth,
  onTestRerun,
  apiReachable,
}: {
  health: SystemHealthState;
  rerunHealth?: RerunHealth | null;
  onTestRerun?: () => void;
  apiReachable: boolean;
}) {
  return (
    <div className="inspector-panel-stack">
      <SectionSourceBar meta={health.meta} />
      <InspectorCard hint="GET /health — process liveness only." title="API">
        <InspectorBadge
          label={health.apiOnline ? 'reachable' : 'offline'}
          tone={health.apiOnline ? 'success' : 'danger'}
        />
        <InspectorField label="Check" value="GET /health" />
      </InspectorCard>

      <InspectorCard hint="GET /rerun/health — SDK install and recording directory." title="Rerun">
        <InspectorBadge
          label={rerunHealth?.sdk_installed ? 'sdk installed' : 'sdk missing'}
          tone={rerunHealth?.sdk_installed ? 'success' : 'danger'}
        />
        <InspectorField label="Viewer mode" value={rerunHealth?.viewer_mode ?? '—'} />
        <InspectorField label="SDK version" value={rerunHealth?.sdk_version ?? '—'} />
        <InspectorField label="Output path" value={rerunHealth?.output_path ?? '—'} />
        <InspectorField label="Recordings" value={String(rerunHealth?.recordings_count ?? 0)} />
        {onTestRerun ? (
          <button
            className="secondary-button full-width"
            disabled={!apiReachable}
            onClick={onTestRerun}
            title={apiReachable ? 'POST /rerun/test-recording' : 'API offline'}
            type="button"
          >
            Test recording
          </button>
        ) : null}
      </InspectorCard>

      <InspectorCard hint="GET /integrations — env var presence, not live connection tests." title="Integrations">
        {health.integrations.map((integration) => (
          <InspectorListItem
            key={integration.id}
            meta={integration.purpose}
            title={integration.label}
            trailing={
              <InspectorBadge
                label={integration.displayLabel}
                tone={
                  integration.status === 'missing_config' || integration.status === 'not_wired'
                    ? 'warning'
                    : integration.status === 'offline'
                      ? 'danger'
                      : 'neutral'
                }
              />
            }
          />
        ))}
      </InspectorCard>

      <InspectorCard hint="Setup steps for integrations that are not yet configured." title="Next steps">
        {health.integrations
          .filter((item) => !item.configured)
          .slice(0, 4)
          .map((item) => (
            <InspectorField key={item.id} label={item.label} value={item.nextStep} />
          ))}
      </InspectorCard>
    </div>
  );
}
