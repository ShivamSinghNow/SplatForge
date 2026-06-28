import {
  Box,
  CheckCircle2,
  Crosshair,
  Eye,
  EyeOff,
  Grid3x3,
  Map,
  RotateCcw,
  Route,
  Target,
} from 'lucide-react';
import type { PreviewDisplayOptions, PreviewViewMode } from '../../lib/types/worldRender';

const VIEW_MODES: Array<{ id: PreviewViewMode; label: string }> = [
  { id: 'live', label: 'Live World' },
  { id: 'replay', label: 'Rollout Replay' },
  { id: 'failure_analysis', label: 'Failure Analysis' },
  { id: 'training_worlds', label: 'Training Variations' },
  { id: 'retest_compare', label: 'Retest Compare' },
  { id: 'robot_edit', label: 'Robot Edit' },
  { id: 'task_preview', label: 'Task Preview' },
];

interface RenderToolbarProps {
  viewMode: PreviewViewMode;
  display: PreviewDisplayOptions;
  frameLabel: string;
  onViewModeChange: (mode: PreviewViewMode) => void;
  onDisplayChange: (patch: Partial<PreviewDisplayOptions>) => void;
  onResetCamera: () => void;
  onTopView: () => void;
  onSideView: () => void;
  onToggleFollow: () => void;
}

export function RenderToolbar({
  viewMode,
  display,
  frameLabel,
  onViewModeChange,
  onDisplayChange,
  onResetCamera,
  onTopView,
  onSideView,
  onToggleFollow,
}: RenderToolbarProps) {
  return (
    <div className="preview-toolbar">
      <div className="preview-toolbar-group">
        <button className="preview-tool-btn" onClick={onResetCamera} title="Reset camera" type="button">
          <RotateCcw size={12} />
        </button>
        <button className="preview-tool-btn" onClick={onTopView} title="Top view" type="button">
          <Map size={12} />
        </button>
        <button className="preview-tool-btn" onClick={onSideView} title="Side view" type="button">
          <Box size={12} />
        </button>
        <button
          className={display.followRobot ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={onToggleFollow}
          title="Follow robot"
          type="button"
        >
          <Crosshair size={12} />
        </button>
      </div>

      <div className="preview-toolbar-group">
        <button
          className={display.showGrid ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showGrid: !display.showGrid })}
          title="Toggle grid"
          type="button"
        >
          <Grid3x3 size={12} />
        </button>
        <button
          className={display.showLabels ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showLabels: !display.showLabels })}
          title="Toggle labels"
          type="button"
        >
          {display.showLabels ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          className={display.showTrajectory ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showTrajectory: !display.showTrajectory })}
          title="Toggle trajectory"
          type="button"
        >
          <Route size={12} />
        </button>
        <button
          className={display.showFailureMarkers ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showFailureMarkers: !display.showFailureMarkers })}
          title="Failure markers"
          type="button"
        >
          <Target size={12} />
        </button>
        <button
          className={display.showSuccessMarkers ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showSuccessMarkers: !display.showSuccessMarkers })}
          title="Success markers"
          type="button"
        >
          <CheckCircle2 size={12} />
        </button>
      </div>

      <span className="preview-frame-label">{frameLabel}</span>

      <label className="preview-view-select">
        <select value={viewMode} onChange={(event) => onViewModeChange(event.target.value as PreviewViewMode)}>
          {VIEW_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
