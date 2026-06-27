import { useCallback, useEffect, useState } from 'react';
import {
  fetchRerunHealth,
  fetchRerunMetadata,
  generateRerunRecording,
  type RerunHealth,
  type RerunRecordingMetadata,
} from '../lib/api/rerun';

export function useRerunRecording(runId: string | null) {
  const [metadata, setMetadata] = useState<RerunRecordingMetadata | null>(null);
  const [health, setHealth] = useState<RerunHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rerunHealth = await fetchRerunHealth();
      setHealth(rerunHealth);
      if (runId) {
        const meta = await fetchRerunMetadata(runId);
        setMetadata(meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'rerun unavailable');
    }
  }, [runId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generate = useCallback(async () => {
    if (!runId) {
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const meta = await generateRerunRecording(runId);
      setMetadata(meta);
      return meta;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'generation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [runId]);

  return {
    metadata,
    health,
    loading,
    error,
    refresh,
    generate,
  };
}
