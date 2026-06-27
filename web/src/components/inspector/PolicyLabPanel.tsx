import type { PolicyVersion } from '../../lib/types/inspector';
import { SectionSourceBar } from '../shared/DataHonesty';
import { InspectorBadge, InspectorCard, InspectorEmpty, InspectorField } from './shared';

export function PolicyLabPanel({ policy }: { policy: PolicyVersion }) {
  const retestTone =
    policy.retestStatus === 'success' ? 'success' : policy.retestStatus === 'failure' ? 'danger' : 'warning';

  return (
    <div className="inspector-panel-stack">
      <SectionSourceBar meta={policy.meta} />
      <InspectorCard hint="Policy versions from the latest run summary." title="Policy versions">
        <InspectorField label="Before" value={policy.before} />
        <InspectorField label="After" value={policy.after} />
        <InspectorField label="Adapter" value={policy.adapterVersion} />
        <div className="inspector-inline-badges">
          <InspectorBadge label={`retest: ${policy.retestStatus}`} tone={retestTone} />
          {!policy.trainingWired ? <InspectorBadge label="training not wired" tone="warning" /> : null}
        </div>
      </InspectorCard>

      <InspectorCard hint="Derived from episode metrics — not a learned reward model score." title="Episode score">
        <InspectorField label="Before" value={`${policy.scoreBefore}%`} />
        <InspectorField label="After" value={`${policy.scoreAfter}%`} />
        <div className="score-line inspector-score-line">
          <span style={{ width: `${policy.scoreBefore}%` }} />
          <strong style={{ width: `${policy.scoreAfter}%` }} />
        </div>
        <p className="inspector-callout">{policy.improvementSummary}</p>
      </InspectorCard>

      <InspectorCard hint="Parameter deltas from dry-run policy adapter — no external trainer." title="Parameter changes">
        {policy.changes.length ? (
          policy.changes.map((change) => (
            <InspectorField
              key={change.parameter}
              label={change.parameter}
              value={`${change.before} → ${change.after}`}
            />
          ))
        ) : (
          <InspectorEmpty message="No adapter parameter changes in this run." />
        )}
      </InspectorCard>
    </div>
  );
}
