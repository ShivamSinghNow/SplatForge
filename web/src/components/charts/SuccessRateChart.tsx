import { useEffect, useMemo, useRef, useState } from 'react';
import type { SuccessRatePoint } from '../../lib/api/client';

interface SuccessRateChartProps {
  points: SuccessRatePoint[];
  currentRate: number;
  animate?: boolean;
}

const WIDTH = 280;
const HEIGHT = 96;
const PAD_X = 8; // keep the end dots/line off the left/right edges
const PAD_Y = 6; // ...and off the top/bottom
const DURATION_MS = 2000;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Live success-rate chart: on a run it draws the line left->right while the big
// number counts up from the first point's rate to the final rate, with dots
// popping in as the line reaches them.
export function SuccessRateChart({ points, currentRate, animate = true }: SuccessRateChartProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [progress, setProgress] = useState(animate ? 0 : 1);

  const maxIndex = useMemo(() => Math.max(...points.map((p) => p.index), 1), [points]);
  const minIndex = points[0]?.index ?? 0;
  const idxSpan = Math.max(maxIndex - minIndex, 1);
  const xOf = (index: number) => PAD_X + ((index - minIndex) / idxSpan) * (WIDTH - 2 * PAD_X);
  const yOf = (rate: number) => PAD_Y + (1 - rate / 100) * (HEIGHT - 2 * PAD_Y);

  const path = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xOf(point.index).toFixed(1)} ${yOf(point.success_rate).toFixed(1)}`)
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, maxIndex]);

  // Animate progress 0 -> 1 whenever a run completes (or the curve changes).
  useEffect(() => {
    if (!animate) {
      setProgress(1);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION_MS);
      setProgress(easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setProgress(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, path]);

  const startRate = points[0]?.success_rate ?? currentRate;
  const displayRate = startRate + (currentRate - startRate) * progress;
  const length = pathRef.current?.getTotalLength?.() ?? 400;
  const lastIndex = Math.max(points.length - 1, 1);

  return (
    <div className="success-chart">
      <div className="success-chart-head">
        <span>success rate</span>
        <strong>{displayRate.toFixed(0)}%</strong>
      </div>
      <svg aria-label="Success rate over runs" className="success-chart-svg" viewBox="0 0 280 96">
        <line className="success-chart-grid" x1="0" x2="280" y1="24" y2="24" />
        <line className="success-chart-grid" x1="0" x2="280" y1="48" y2="48" />
        <line className="success-chart-grid" x1="0" x2="280" y1="72" y2="72" />
        <path
          ref={pathRef}
          className="success-chart-line"
          d={path}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: length,
            strokeDashoffset: length * (1 - progress),
            transition: 'none',
          }}
        />
        {points.map((point, index) => {
          const x = xOf(point.index);
          const y = yOf(point.success_rate);
          const reachedAt = index / lastIndex; // line reaches this point at this progress
          return (
            <circle
              className="success-chart-dot"
              cx={x}
              cy={y}
              key={`${point.index}-${point.label}`}
              r={3}
              style={{ opacity: progress >= reachedAt - 0.02 ? 1 : 0, transition: 'opacity 180ms ease' }}
            />
          );
        })}
      </svg>
      <div className="success-chart-labels">
        {points.slice(-3).map((point) => (
          <span key={`${point.index}-${point.label}`}>{point.label || `run ${point.index}`}</span>
        ))}
      </div>
    </div>
  );
}
