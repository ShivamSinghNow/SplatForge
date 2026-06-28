import { useEffect, useRef, useState } from 'react';
import { WebViewer } from '@rerun-io/web-viewer';
import type { PreviewViewMode } from '../../lib/types/worldRender';
import {
  rerunDownloadUrl,
  rerunFileUrl,
  rerunViewerIframeUrl,
  type RerunRecordingMetadata,
} from '../../lib/api/rerun';
import { RerunControls, type RerunJumpTarget } from './RerunControls';

interface RerunViewerPanelProps {
  runId: string | null;
  metadata: RerunRecordingMetadata | null;
  health: { sdk_installed: boolean; sdk_version: string; viewer_mode: string } | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  onRefresh: () => void;
  demoJumpTarget?: 'failure_frame' | 'gemini_critique' | 'curriculum_generated' | 'retest_success' | null;
}

export function RerunViewerPanel({
  runId,
  metadata,
  health,
  loading,
  error,
  onGenerate,
  onRefresh,
  demoJumpTarget = null,
}: RerunViewerPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<WebViewer | null>(null);
  const [viewMode, setViewMode] = useState<PreviewViewMode>('replay');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const exists = Boolean(metadata?.exists && runId);
  const sdkVersion = metadata?.sdk_version ?? health?.sdk_version ?? '0.33.1';
  const fileUrl = runId ? rerunFileUrl(runId, metadata) : null;

  useEffect(() => {
    if (!exists || !fileUrl || !containerRef.current || useIframeFallback || !runId) {
      return;
    }

    let cancelled = false;
    const viewer = new WebViewer();
    viewerRef.current = viewer;
    setViewerError(null);

    void (async () => {
      try {
        const absoluteUrl = fileUrl.startsWith('http')
          ? fileUrl
          : `${window.location.origin}${fileUrl}`;
        await viewer.start(absoluteUrl, containerRef.current!, {
          width: '100%',
          height: '100%',
          hide_welcome_screen: true,
        });
        if (cancelled) {
          viewer.stop();
        }
      } catch (err) {
        setUseIframeFallback(true);
        setViewerError(err instanceof Error ? err.message : 'embedded viewer failed — using iframe fallback');
        viewer.stop();
      }
    })();

    return () => {
      cancelled = true;
      viewer.stop();
      viewerRef.current = null;
    };
  }, [exists, fileUrl, runId, useIframeFallback]);

  useEffect(() => {
    if (!demoJumpTarget) {
      return;
    }
    jumpTo(demoJumpTarget);
  }, [demoJumpTarget, metadata?.jump_frames]);

  function jumpTo(target: RerunJumpTarget) {
    const frame = metadata?.jump_frames?.[target];
    if (frame === undefined) {
      return;
    }
    if (target === 'failure_frame' || target === 'gemini_critique') {
      setViewMode('failure_analysis');
    } else if (target === 'retest_success') {
      setViewMode('retest_compare');
    } else if (target === 'curriculum_generated') {
      setViewMode('replay');
    } else {
      setViewMode('live');
    }
    // Frame seeking requires viewer API hooks; timeline jumps are surfaced in metadata for now.
    void frame;
  }

  function openExternal() {
    if (!runId || !fileUrl) {
      return;
    }
    const iframe = rerunViewerIframeUrl(runId, sdkVersion, fileUrl);
    window.open(iframe, '_blank', 'noopener,noreferrer');
  }

  function downloadRecording() {
    if (!runId) {
      return;
    }
    window.open(rerunDownloadUrl(runId), '_blank');
  }

  const iframeSrc =
    exists && runId && fileUrl ? rerunViewerIframeUrl(runId, sdkVersion, fileUrl) : null;

  return (
    <section className="rerun-panel preview-stage" aria-label="Rerun robotics viewer">
      <div className="preview-hud preview-hud-top">
        <div>
          <span className="hud-kicker">telemetry</span>
          <strong>Rerun Viewer</strong>
        </div>
        <div className="preview-hud-meta">
          <span className="hud-pill hud-pill-accent">{exists ? 'recording loaded' : 'no recording'}</span>
          <span className="hud-pill">{health?.viewer_mode ?? 'embedded'}</span>
        </div>
      </div>

      <RerunControls
        exists={exists}
        generatedAt={metadata?.generated_at}
        loading={loading}
        onDownload={downloadRecording}
        onGenerate={onGenerate}
        onJump={jumpTo}
        onOpenExternal={openExternal}
        onRegenerate={onRefresh}
        onViewModeChange={setViewMode}
        sdkInstalled={health?.sdk_installed ?? false}
        viewMode={viewMode}
      />

      <div className="rerun-viewer-shell">
        {!runId ? (
          <div className="rerun-empty">
            <p>Run a practice loop to generate a Rerun recording.</p>
          </div>
        ) : !exists ? (
          <div className="rerun-empty">
            <p>No Rerun recording yet for {runId}.</p>
            <p className="rerun-empty-sub">Generate a recording to open the 3D rollout timeline.</p>
            <button className="primary-button" disabled={loading} onClick={onGenerate} type="button">
              Generate Rerun Recording
            </button>
          </div>
        ) : useIframeFallback && iframeSrc ? (
          <iframe className="rerun-iframe" src={iframeSrc} title={`Rerun viewer ${runId}`} />
        ) : (
          <div className="rerun-viewer-canvas" ref={containerRef} />
        )}
      </div>

      {(error || viewerError) && <p className="rerun-error">{error ?? viewerError}</p>}

      <div className="preview-hud preview-hud-bottom rerun-hud-bottom">
        <div>
          <span className="hud-kicker">run</span>
          <strong>{runId ?? '—'}</strong>
        </div>
        <div>
          <span className="hud-kicker">frames</span>
          <strong>{metadata?.frame_count ?? 0}</strong>
        </div>
        <div>
          <span className="hud-kicker">score</span>
          <strong>
            {metadata ? `${metadata.score_before}% → ${metadata.score_after}%` : '—'}
          </strong>
        </div>
        <div>
          <span className="hud-kicker">mode</span>
          <strong>{viewMode}</strong>
        </div>
      </div>
    </section>
  );
}
