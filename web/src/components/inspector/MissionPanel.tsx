import type { MissionState } from '../../lib/types/inspector';
import { SectionSourceBar } from '../shared/DataHonesty';
import { InspectorBadge, InspectorCard, InspectorField } from './shared';

export function MissionPanel({ mission }: { mission: MissionState }) {
  return (
    <div className="inspector-panel-stack">
      <SectionSourceBar meta={mission.meta} />
      <InspectorCard hint="Current operational context for the active practice loop." title="Active mission">
        <InspectorField label="Task" value={mission.activeTask} />
        <InspectorField label="World" value={mission.activeWorld} />
        <InspectorField label="Robot" value={mission.robotTypeLabel} />
        <InspectorField label="Backend" value={mission.backend} />
        <InspectorField label="Run" value={mission.runId ?? '—'} />
      </InspectorCard>

      <InspectorCard hint="Where the RSI loop is in the scan → sim → critique → train cycle." title="Loop state">
        <div className="inspector-inline-badges">
          <InspectorBadge label={mission.loopStepLabel} tone="accent" />
          <InspectorBadge label={mission.phase} tone={mission.phase.includes('success') ? 'success' : 'neutral'} />
        </div>
        <InspectorField label="Policy" value={mission.policyVersion} />
        <InspectorField label="Adapter" value={mission.adapterVersion} />
      </InspectorCard>

      <InspectorCard hint="Recommended operator action based on the current loop step." title="Next action">
        <p className="inspector-callout">{mission.nextAction}</p>
      </InspectorCard>
    </div>
  );
}
