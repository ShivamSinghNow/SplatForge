import type { RobotPanelState } from '../../lib/types/inspector';
import { INSPECTOR_CATALOG } from '../../lib/services/inspectorCatalog';
import { SectionSourceBar } from '../shared/DataHonesty';
import { InspectorBadge, InspectorCard, InspectorField, InspectorRange, InspectorSelect } from './shared';

interface RobotPanelProps {
  robot: RobotPanelState;
  onChange: (patch: Partial<RobotPanelState>) => void;
}

export function RobotPanel({ robot, onChange }: RobotPanelProps) {
  return (
    <div className="inspector-panel-stack">
      <SectionSourceBar meta={robot.meta} />
      <InspectorCard hint="Local UI selection — not sent to POST /runs or Rerun yet." title="Robot platform">
        <InspectorSelect
          hint="Preview catalog only until run API accepts robot config"
          label="Robot type"
          onChange={(robotType) => onChange({ robotType })}
          options={INSPECTOR_CATALOG.robotTypes.map((item) => ({ id: item.id, label: item.label }))}
          value={robot.robotType}
        />
        <InspectorSelect
          hint="End-effector geometry for future render wiring"
          label="Gripper"
          onChange={(gripperType) => onChange({ gripperType })}
          options={INSPECTOR_CATALOG.gripperTypes.map((item) => ({ id: item.id, label: item.label }))}
          value={robot.gripperType}
        />
      </InspectorCard>

      <InspectorCard hint="Local editor defaults — not live telemetry from a run." title="Status">
        <div className="inspector-inline-badges">
          <InspectorBadge label="local only" tone="warning" />
          <InspectorBadge label={robot.status} tone={robot.status === 'error' ? 'danger' : 'accent'} />
          <InspectorBadge label={robot.controlMode} tone="neutral" />
        </div>
        <InspectorField
          label="Pose"
          value={`${robot.pose.x.toFixed(2)}, ${robot.pose.y.toFixed(2)}, ${robot.pose.z.toFixed(2)}`}
        />
        <InspectorField label="Current action" value={robot.currentAction} />
      </InspectorCard>

      <InspectorCard hint="Stored in browser memory only — not persisted or sent to backend." title="Configuration">
        <InspectorSelect
          label="Control mode"
          onChange={(controlMode) => onChange({ controlMode })}
          options={INSPECTOR_CATALOG.controlModes.map((item) => ({ id: item, label: item }))}
          value={robot.controlMode}
        />
        <InspectorSelect
          label="Safety mode"
          onChange={(safetyMode) => onChange({ safetyMode })}
          options={INSPECTOR_CATALOG.safetyModes.map((item) => ({ id: item, label: item }))}
          value={robot.safetyMode}
        />
        <InspectorRange
          hint="Local preview parameter"
          label="Max speed"
          max={1.5}
          min={0.1}
          onChange={(maxSpeed) => onChange({ maxSpeed })}
          step={0.05}
          value={robot.maxSpeed}
        />
        <InspectorRange
          hint="Local preview parameter"
          label="Approach height"
          max={0.35}
          min={0.05}
          onChange={(approachHeight) => onChange({ approachHeight })}
          step={0.01}
          value={robot.approachHeight}
        />
        <InspectorRange
          hint="Local preview parameter"
          label="Gripper width"
          max={0.12}
          min={0.02}
          onChange={(gripperWidth) => onChange({ gripperWidth })}
          step={0.005}
          value={robot.gripperWidth}
        />
      </InspectorCard>
    </div>
  );
}
