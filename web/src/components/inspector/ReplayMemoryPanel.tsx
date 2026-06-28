import type { ReactNode } from 'react';
import type { ReplayMemoryState } from '../../lib/types/inspector';
import { DataSourceBadge, SectionSourceBar } from '../shared/DataHonesty';
import { InspectorBadge, InspectorCard, InspectorEmpty, InspectorField, InspectorListItem } from './shared';

export function ReplayMemoryPanel({ memory }: { memory: ReplayMemoryState }) {
  const mongoTone =
    memory.mongoStatus === 'configured' ? 'warning' : memory.mongoStatus === 'local' ? 'neutral' : 'danger';

  return (
    <div className="inspector-panel-stack">
      <SectionSourceBar meta={memory.meta} />
      <InspectorCard hint="MongoDB is env-configured only — connection is not tested from the UI." title="Episode storage">
        <div className="inspector-inline-badges">
          <InspectorBadge label={memory.mongoStatus} tone={mongoTone} />
        </div>
        <InspectorField label="Storage" value={memory.mongoLabel} />
        <InspectorField label="Selected examples" value={String(memory.selectedExamples.length)} />
      </InspectorCard>

      <MemorySection empty="No failures recorded yet." items={memory.latestFailures} title="Latest failures" />
      <MemorySection empty="No successful trajectories yet." items={memory.successfulTrajectories} title="Successful trajectories" />
      <MemorySection
        empty="Run a loop with API online to query similar failures."
        items={memory.similarFailures}
        title="Similar failures"
        trailing={
          memory.similarFailures.length ? (
            <DataSourceBadge source={memory.similarSource} label={memory.similarSource === 'mongodb' ? 'MongoDB' : 'API search'} />
          ) : null
        }
      />
    </div>
  );
}

function MemorySection({
  title,
  items,
  empty,
  trailing,
}: {
  title: string;
  items: ReplayMemoryState['latestFailures'];
  empty: string;
  trailing?: ReactNode;
}) {
  return (
    <InspectorCard title={title}>
      {trailing}
      {items.length ? (
        items.map((item) => (
          <InspectorListItem
            key={item.id}
            meta={item.summary}
            title={item.label}
            trailing={<InspectorBadge label={item.kind} tone={item.kind === 'success' ? 'success' : 'danger'} />}
          />
        ))
      ) : (
        <InspectorEmpty message={empty} />
      )}
    </InspectorCard>
  );
}
