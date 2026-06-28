import { Check } from 'lucide-react';
import type { WorkflowStep } from '../../lib/runMetrics';

interface WorkflowBarProps {
  steps: WorkflowStep[];
}

export function WorkflowBar({ steps }: WorkflowBarProps) {
  return (
    <div className="workflow-bar">
      {steps.map((step) => (
        <div className={`workflow-step workflow-step-${step.status}`} key={step.id} style={{ flex: 1 }}>
          <span className="workflow-icon">
            {step.status === 'complete' || step.status === 'failed' ? <Check size={12} /> : null}
          </span>
          <span className="workflow-label">{step.label}</span>
        </div>
      ))}
    </div>
  );
}
