import { Play } from 'lucide-react';
import type { InspectorCatalog, TaskConfig } from '../../lib/types/inspector';
import { SectionSourceBar } from '../shared/DataHonesty';
import { InspectorCard, InspectorEmpty, InspectorInput, InspectorSelect, InspectorTextarea } from './shared';

interface TaskBuilderPanelProps {
  task: TaskConfig & { meta?: import('../../lib/types/dataSource').SectionMeta };
  catalog: InspectorCatalog;
  loading: boolean;
  apiOnline: boolean;
  isDemo: boolean;
  onChange: (patch: Partial<TaskConfig>) => void;
  onRun: () => void;
  onExampleSelect: (example: { label: string; taskType: TaskConfig['taskType'] }) => void;
}

export function TaskBuilderPanel({
  task,
  catalog,
  loading,
  apiOnline,
  isDemo,
  onChange,
  onRun,
  onExampleSelect,
}: TaskBuilderPanelProps) {
  const canRun = apiOnline && !isDemo;
  return (
    <div className="inspector-panel-stack">
      {task.meta ? <SectionSourceBar meta={task.meta} /> : null}
      <InspectorCard hint="Instruction is stored locally — POST /runs uses scene + task IDs only today." title="Task input">
        <InspectorTextarea
          hint="Describe what the robot should learn or recover from"
          label="Instruction"
          onChange={(instruction) => onChange({ instruction })}
          placeholder="Teach the robot to..."
          value={task.instruction}
        />
      </InspectorCard>

      <InspectorCard hint="Structured task definition for curriculum and scoring." title="Task definition">
        <InspectorSelect
          label="Task type"
          onChange={(taskType) => onChange({ taskType })}
          options={catalog.taskTypes.map((item) => ({ id: item.id, label: item.label }))}
          value={task.taskType}
        />
        <InspectorSelect
          label="Target object"
          onChange={(targetObject) => onChange({ targetObject })}
          options={catalog.targetObjects.map((item) => ({ id: item, label: item }))}
          value={task.targetObject}
        />
        <InspectorInput
          label="Success condition"
          onChange={(successCondition) => onChange({ successCondition })}
          value={task.successCondition}
        />
        <InspectorSelect
          label="Difficulty"
          onChange={(difficulty) => onChange({ difficulty })}
          options={catalog.difficulties.map((item) => ({ id: item, label: item }))}
          value={task.difficulty}
        />
      </InspectorCard>

      <InspectorCard hint="Constraints applied during simulation episodes." title="Environment">
        <InspectorInput
          label="Constraint 1"
          onChange={(value) => onChange({ constraints: [value, task.constraints[1] ?? ''].filter(Boolean) })}
          value={task.constraints[0] ?? ''}
        />
        <InspectorInput
          label="Constraint 2"
          onChange={(value) => onChange({ constraints: [task.constraints[0] ?? '', value].filter(Boolean) })}
          value={task.constraints[1] ?? ''}
        />
      </InspectorCard>

      <InspectorCard hint="Quick-fill common manipulation missions." title="Examples">
        <div className="inspector-chip-row">
          {catalog.taskExamples.map((example) => (
            <button
              className="inspector-chip"
              key={example.id}
              onClick={() => onExampleSelect(example)}
              title={example.label}
              type="button"
            >
              {example.label}
            </button>
          ))}
        </div>
      </InspectorCard>

      <button
        className="primary-button full-width inspector-run-btn"
        disabled={loading || !canRun}
        onClick={onRun}
        title={isDemo ? 'Start API to run live loops' : !apiOnline ? 'API offline' : 'POST /runs'}
        type="button"
      >
        <Play size={14} />
        {loading ? 'Running loop...' : 'Run practice loop'}
      </button>

      {isDemo ? (
        <InspectorEmpty message="Demo Mode: fixture data loaded. Start uvicorn to run live tasks." />
      ) : !apiOnline ? (
        <InspectorEmpty message="API offline — start uvicorn to run tasks." />
      ) : null}
    </div>
  );
}
