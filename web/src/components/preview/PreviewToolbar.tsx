import {
  Box,
  CheckCircle2,
  Crosshair,
  Eye,
  EyeOff,
  Map,
  RotateCcw,
  Route,
  Target,
} from 'lucide-react';
import type { PreviewDisplayOptions, PreviewViewMode } from '../../lib/types/worldRender';

const VIEW_MODES: Array<{ id: PreviewViewMode; label: string }> = [
  { id: 'live', label: 'live' },
  { id: 'replay', label: 'replay' },
  { id: 'failure_analysis', label: 'fail' },
  { id: 'training_worlds', label: 'train' },
  { id: 'retest_compare', label: 'compare' },
];

interface PreviewToolbarProps {
  viewMode: PreviewViewMode;
  display: PreviewDisplayOptions;
  onViewModeChange: (mode: PreviewViewMode) => void;
  onDisplayChange: (patch: Partial<PreviewDisplayOptions>) => void;
  onResetCamera: () => void;
  onTopView: () => void;
  onSideView: () => void;
  onToggleFollow: () => void;
}

export function PreviewToolbar({
  viewMode,
  display,
  onViewModeChange,
  onDisplayChange,
  onResetCamera,
  onTopView,
  onSideView,
  onToggleFollow,
}: PreviewToolbarProps) {
  return (
    <div className="preview-toolbar">
      <div className="preview-toolbar-group">
        <button className="preview-tool-btn" onClick={onResetCamera} title="reset" type="button">
          <RotateCcw size={12} />
        </button>
        <button className="preview-tool-btn" onClick={onTopView} title="top" type="button">
          <Map size={12} />
        </button>
        <button className="preview-tool-btn" onClick={onSideView} title="side" type="button">
          <Box size={12} />
        </button>
        <button
          className={display.followRobot ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={onToggleFollow}
          title="follow"
          type="button"
        >
          <Crosshair size={12} />
        </button>
      </div>

      <div className="preview-toolbar-group">
        <button
          className={display.showLabels ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showLabels: !display.showLabels })}
          title="labels"
          type="button"
        >
          {display.showLabels ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          className={display.showTrajectory ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showTrajectory: !display.showTrajectory })}
          title="path"
          type="button"
        >
          <Route size={12} />
        </button>
        <button
          className={display.showFailureMarkers ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showFailureMarkers: !display.showFailureMarkers })}
          title="fail markers"
          type="button"
        >
          <Target size={12} />
        </button>
        <button
          className={display.showSuccessMarkers ? 'preview-tool-btn active' : 'preview-tool-btn'}
          onClick={() => onDisplayChange({ showSuccessMarkers: !display.showSuccessMarkers })}
          title="pass markers"
          type="button"
        >
          <CheckCircle2 size={12} />
        </button>
      </div>

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
