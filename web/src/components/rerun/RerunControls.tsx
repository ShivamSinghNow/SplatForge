import {
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { PreviewViewMode } from '../../lib/types/worldRender';

export type RerunJumpTarget =
  | 'initial_attempt'
  | 'failure_frame'
  | 'gemini_critique'
  | 'curriculum_generated'
  | 'retest_success';

interface RerunControlsProps {
  loading: boolean;
  exists: boolean;
  sdkInstalled: boolean;
  generatedAt?: string | null;
  viewMode: PreviewViewMode;
  onGenerate: () => void;
  onRegenerate: () => void;
  onOpenExternal: () => void;
  onDownload: () => void;
  onViewModeChange: (mode: PreviewViewMode) => void;
  onJump: (target: RerunJumpTarget) => void;
}

const VIEW_MODES: Array<{ id: PreviewViewMode; label: string }> = [
  { id: 'live', label: 'Live World' },
  { id: 'replay', label: 'Rollout Replay' },
  { id: 'failure_analysis', label: 'Failure Analysis' },
  { id: 'retest_compare', label: 'Retest Compare' },
];

const JUMP_TARGETS: Array<{ id: RerunJumpTarget; label: string }> = [
  { id: 'initial_attempt', label: 'Initial Attempt' },
  { id: 'failure_frame', label: 'Failure Frame' },
  { id: 'gemini_critique', label: 'Gemini Critique' },
  { id: 'curriculum_generated', label: 'Curriculum Generated' },
  { id: 'retest_success', label: 'Retest Success' },
];

export function RerunControls({
  loading,
  exists,
  sdkInstalled,
  generatedAt,
  viewMode,
  onGenerate,
  onRegenerate,
  onOpenExternal,
  onDownload,
  onViewModeChange,
  onJump,
}: RerunControlsProps) {
  return (
    <div className="rerun-controls">
      <div className="rerun-controls-row">
        <button className="primary-button" disabled={loading || !sdkInstalled} onClick={onGenerate} type="button">
          <Sparkles size={14} />
          {exists ? 'Regenerate Recording' : 'Generate Rerun Recording'}
        </button>
        <button className="secondary-button" disabled={!exists} onClick={onOpenExternal} type="button">
          <ExternalLink size={14} />
          Open Viewer
        </button>
        <button className="secondary-button" disabled={!exists} onClick={onDownload} type="button">
          <Download size={14} />
          Download .rrd
        </button>
        <button className="secondary-button" disabled={loading} onClick={onRegenerate} type="button">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="rerun-controls-row rerun-controls-meta">
        <span className={sdkInstalled ? 'rerun-status ok' : 'rerun-status bad'}>
          SDK {sdkInstalled ? 'ready' : 'missing'}
        </span>
        <span className="rerun-status">{exists ? 'recording ready' : 'no recording'}</span>
        {generatedAt ? <span className="rerun-status">generated {new Date(generatedAt).toLocaleString()}</span> : null}
      </div>

      <div className="rerun-controls-row">
        <label className="rerun-select">
          View mode
          <select value={viewMode} onChange={(event) => onViewModeChange(event.target.value as PreviewViewMode)}>
            {VIEW_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rerun-jump-row">
        {JUMP_TARGETS.map((target) => (
          <button
            className="inspector-chip"
            disabled={!exists}
            key={target.id}
            onClick={() => onJump(target.id)}
            type="button"
          >
            {target.label}
          </button>
        ))}
      </div>
    </div>
  );
}
