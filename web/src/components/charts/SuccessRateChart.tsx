import { useEffect, useMemo, useState } from 'react';
import type { SuccessRatePoint } from '../../lib/api/client';

interface SuccessRateChartProps {
  points: SuccessRatePoint[];
  currentRate: number;
  animate?: boolean;
}

export function SuccessRateChart({ points, currentRate, animate = true }: SuccessRateChartProps) {
  const [revealed, setRevealed] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      return;
    }
    setRevealed(false);
    const timer = window.setTimeout(() => setRevealed(true), 80);
    return () => window.clearTimeout(timer);
  }, [animate, points]);

  const path = useMemo(() => {
    if (points.length === 0) {
      return '';
    }
    const width = 280;
    const height = 96;
    const maxIndex = Math.max(...points.map((point) => point.index), 1);
    return points
      .map((point, index) => {
        const x = (point.index / maxIndex) * width;
        const y = height - (point.success_rate / 100) * height;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points]);

  return (
    <div className="success-chart">
      <div className="success-chart-head">
        <span>success rate</span>
        <strong>{currentRate.toFixed(0)}%</strong>
      </div>
      <svg aria-label="Success rate over runs" className="success-chart-svg" viewBox="0 0 280 96">
        <line className="success-chart-grid" x1="0" x2="280" y1="24" y2="24" />
        <line className="success-chart-grid" x1="0" x2="280" y1="48" y2="48" />
        <line className="success-chart-grid" x1="0" x2="280" y1="72" y2="72" />
        <path
          className={`success-chart-line ${revealed ? 'success-chart-line-revealed' : ''}`}
          d={path}
          fill="none"
        />
        {points.map((point) => {
          const maxIndex = Math.max(...points.map((item) => item.index), 1);
          const x = (point.index / maxIndex) * 280;
          const y = 96 - (point.success_rate / 100) * 96;
          return (
            <circle
              className="success-chart-dot"
              cx={x}
              cy={y}
              key={`${point.index}-${point.label}`}
              r={3}
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
