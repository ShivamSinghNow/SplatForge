import { useCallback, useEffect, useRef, useState } from 'react';
import { OVERNIGHT_DEMO_BEATS, type DemoBeat } from '../lib/fixtures/presentation';

export type { DemoBeat, DemoBeatId } from '../lib/fixtures/presentation';

interface UseDemoPresentationOptions {
  onBeat?: (beat: DemoBeat) => void;
}

export function useDemoPresentation({ onBeat }: UseDemoPresentationOptions = {}) {
  const [active, setActive] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const beat = OVERNIGHT_DEMO_BEATS[beatIndex] ?? null;
  const totalDurationMs = OVERNIGHT_DEMO_BEATS.reduce((sum, item) => sum + item.durationMs, 0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setActive(false);
    setBeatIndex(0);
    setElapsedMs(0);
  }, [clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    setActive(true);
    setBeatIndex(0);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
    onBeat?.(OVERNIGHT_DEMO_BEATS[0]);
  }, [clearTimer, onBeat]);

  useEffect(() => {
    if (!active) {
      return;
    }
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);
    return () => clearTimer();
  }, [active, clearTimer]);

  useEffect(() => {
    if (!active || !beat) {
      return;
    }
    const timer = window.setTimeout(() => {
      const next = beatIndex + 1;
      if (next >= OVERNIGHT_DEMO_BEATS.length) {
        stop();
        return;
      }
      setBeatIndex(next);
      onBeat?.(OVERNIGHT_DEMO_BEATS[next]);
    }, beat.durationMs);
    return () => window.clearTimeout(timer);
  }, [active, beat, beatIndex, onBeat, stop]);

  return {
    active,
    beat,
    beatIndex,
    beatCount: OVERNIGHT_DEMO_BEATS.length,
    elapsedMs,
    totalDurationMs,
    progress: totalDurationMs ? Math.min(elapsedMs / totalDurationMs, 1) : 0,
    start,
    stop,
  };
}
