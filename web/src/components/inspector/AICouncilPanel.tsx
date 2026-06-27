import type { CouncilState } from '../../lib/types/inspector';
import { SectionSourceBar } from '../shared/DataHonesty';
import { InspectorBadge, InspectorCard, InspectorEmpty, InspectorField, InspectorListItem } from './shared';

export function AICouncilPanel({ council }: { council: CouncilState }) {
  return (
    <div className="inspector-panel-stack">
      <SectionSourceBar meta={council.meta} />
      <InspectorCard hint="Aggregated failure hypothesis from the latest run critics." title="Consensus">
        <p className="inspector-callout">{council.consensusFailure}</p>
        <InspectorField
          label="Overall confidence"
          value={council.hasRunData ? `${Math.round(council.overallConfidence * 100)}%` : '—'}
        />
        <InspectorField label="Disagreement" value={council.disagreementSummary} />
        <InspectorField label="Next curriculum" value={council.nextCurriculumSuggestion} />
      </InspectorCard>

      <InspectorCard hint="Critics returned by POST /runs — inactive critics were skipped." title="Council members">
        {council.critics.length ? (
          council.critics.map((critic) => (
            <InspectorListItem
              key={critic.id}
              meta={critic.role}
              title={critic.name}
              trailing={
                <div className="inspector-list-trail">
                  <InspectorBadge
                    label={critic.hasOutput ? critic.source : critic.configured ? 'skipped' : 'missing key'}
                    tone={critic.hasOutput ? 'success' : critic.configured ? 'warning' : 'neutral'}
                  />
                  <strong>{critic.hasOutput ? `${Math.round(critic.confidence * 100)}%` : '—'}</strong>
                </div>
              }
            />
          ))
        ) : (
          <InspectorEmpty message="No critic results yet. Run an attempt to generate AI council feedback." />
        )}
      </InspectorCard>

      {council.critics.length ? (
        <InspectorCard hint="Root cause and evidence per critic from run data." title="Critic detail">
          {council.critics.map((critic) => (
            <div className="inspector-subcard" key={`detail-${critic.id}`}>
              <strong>{critic.name}</strong>
              <InspectorField label="Root cause" value={critic.rootCause} />
              <InspectorField label="Evidence" value={critic.evidence.join('; ') || '—'} />
            </div>
          ))}
        </InspectorCard>
      ) : null}
    </div>
  );
}
