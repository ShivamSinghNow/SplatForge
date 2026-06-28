import type { RunScores } from '../../lib/runMetrics';

interface CompareHeaderProps {
  scores: RunScores;
  runId: string | null;
  hasRun: boolean;
  retestStatus?: string | null;
}

export function CompareHeader({ scores, runId, hasRun, retestStatus }: CompareHeaderProps) {
  const retestLabel =
    !hasRun ? '—' : scores.retestPassed ? 'passed' : retestStatus === 'failure' ? 'failed' : 'pending';

  return (
    <div className="compare-header">
      <div className={`compare-card compare-card-${scores.initialFailed ? 'fail' : 'pass'}`}>
        <span className="compare-kicker">original run</span>
        <div className="compare-title-row">
          <strong>{runId ?? '—'}</strong>
          <span className={`verdict verdict-${scores.initialFailed ? 'fail' : 'pass'}`}>
            {hasRun ? (scores.initialFailed ? 'failed' : 'passed') : '—'}
          </span>
        </div>
        <div className="compare-score">{hasRun ? scores.initialScore : '—'}</div>
      </div>
      <div className={`compare-card compare-card-${scores.retestPassed ? 'pass' : 'neutral'}`}>
        <span className="compare-kicker">improved replay</span>
        <div className="compare-title-row">
          <strong>{runId ? `${runId}_retest` : '—'}</strong>
          <span className={`verdict verdict-${scores.retestPassed ? 'pass' : retestLabel === 'failed' ? 'fail' : 'neutral'}`}>
            {retestLabel}
          </span>
        </div>
        <div className="compare-score">{scores.retestPassed ? scores.retestScore : '—'}</div>
      </div>
      <div className="compare-delta">
        <span className="compare-kicker">score delta</span>
        <strong className={scores.delta > 0 ? 'delta-positive' : 'delta-neutral'}>
          {scores.delta > 0 ? `+${scores.delta}` : '—'}
        </strong>
      </div>
    </div>
  );
}
