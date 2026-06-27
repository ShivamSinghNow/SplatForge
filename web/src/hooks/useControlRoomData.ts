import { useCallback, useEffect, useState } from 'react';
import {
  createRun,
  fetchHealth,
  fetchIntegrations,
  fetchRuns,
  fetchScenes,
  fetchSuccessRate,
  fetchTasks,
} from '../lib/api/client';
import { DEMO_INTEGRATIONS, DEMO_RUN, DEMO_RUNS, DEMO_SUCCESS_RATE } from '../lib/fixtures/trainingRuns';
import { DEMO_TASKS } from '../lib/fixtures/tasks';
import { DEMO_WORLDS } from '../lib/fixtures/worlds';
import type { IntegrationStatus, RunSummary, SceneOption, SuccessRateSeries, TaskOption } from '../lib/api/types';
import { mapTimelineToStep } from '../lib/render/mapPreviewFromRun';
import type { DataSource } from '../lib/types/dataSource';
import type { LoopStepId } from '../lib/types/splatforge';

function loadDemoState() {
  return {
    scenes: DEMO_WORLDS,
    tasks: DEMO_TASKS,
    integrations: [...DEMO_INTEGRATIONS] as IntegrationStatus[],
    runs: DEMO_RUNS,
    metrics: DEMO_SUCCESS_RATE,
    activeRun: DEMO_RUN,
    selectedScene: DEMO_WORLDS[0]?.id ?? '',
    selectedTask: DEMO_TASKS[0]?.id ?? '',
    currentStep: mapTimelineToStep(DEMO_RUN.timeline, DEMO_RUN.phase) as LoopStepId,
  };
}

export function useControlRoomData() {
  const [apiOnline, setApiOnline] = useState(false);
  const [usingFixtures, setUsingFixtures] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>('unavailable');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('connecting...');
  const [scenes, setScenes] = useState<SceneOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedScene, setSelectedScene] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [activeRun, setActiveRun] = useState<RunSummary | null>(null);
  const [currentStep, setCurrentStep] = useState<LoopStepId>('world');
  const [metrics, setMetrics] = useState<SuccessRateSeries>({ points: [], current_rate: 0, source: 'empty' });
  const [submittedCommand, setSubmittedCommand] = useState('');

  const applyDemoFallback = useCallback(() => {
    const demo = loadDemoState();
    setUsingFixtures(true);
    setDataSource('fixture');
    setScenes(demo.scenes);
    setTasks(demo.tasks);
    setIntegrations(demo.integrations);
    setRuns(demo.runs);
    setMetrics(demo.metrics);
    setSelectedScene(demo.selectedScene);
    setSelectedTask(demo.selectedTask);
    setActiveRun(demo.activeRun);
    setCurrentStep(demo.currentStep);
    setNotice('Demo Mode: using local fixture data. Start API for live runs.');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [sceneData, taskData, integrationData, runData, series] = await Promise.all([
        fetchScenes(),
        fetchTasks(),
        fetchIntegrations(),
        fetchRuns(),
        fetchSuccessRate(),
      ]);
      setUsingFixtures(false);
      setDataSource('api');
      setScenes(sceneData.scenes);
      setTasks(taskData.tasks);
      setIntegrations(integrationData.integrations);
      setRuns(runData.runs);
      setMetrics(series);
      setSelectedScene((current) => current || sceneData.scenes[0]?.id || '');
      setSelectedTask((current) => current || taskData.tasks[0]?.id || '');
      setActiveRun((current) => current ?? runData.runs[0] ?? null);
      if (runData.runs[0]) {
        setCurrentStep(mapTimelineToStep(runData.runs[0].timeline, runData.runs[0].phase));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'refresh failed');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await fetchHealth();
        setApiOnline(true);
        await refresh();
        setNotice('ready');
      } catch {
        setApiOnline(false);
        applyDemoFallback();
      }
    })();
  }, [applyDemoFallback, refresh]);

  const selectRun = useCallback(
    (runId: string) => {
      const run = runs.find((item) => item.run_id === runId) ?? null;
      setActiveRun(run);
      if (run) {
        setCurrentStep(mapTimelineToStep(run.timeline, run.phase));
      }
    },
    [runs],
  );

  const runLoop = useCallback(
    async (command: string) => {
      if (!apiOnline || usingFixtures) {
        setNotice(
          usingFixtures
            ? 'Demo Mode: start the API (uvicorn) to run a live practice loop.'
            : 'API offline — cannot run loop.',
        );
        return null;
      }
      setLoading(true);
      setNotice('running...');
      setSubmittedCommand(command.trim());
      try {
        const summary = await createRun(selectedScene, selectedTask, 'dry-run');
        const [runData, series] = await Promise.all([fetchRuns(), fetchSuccessRate(true)]);
        setRuns(runData.runs.length ? runData.runs : [summary]);
        setActiveRun(summary);
        setMetrics(series);
        setCurrentStep(mapTimelineToStep(summary.timeline, summary.phase));
        setNotice(summary.phase);
        return summary;
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'run failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiOnline, selectedScene, selectedTask, usingFixtures],
  );

  const resetLoop = useCallback(() => {
    setCurrentStep('world');
    setNotice(apiOnline && !usingFixtures ? 'ready' : 'Demo Mode: fixture data loaded.');
  }, [apiOnline, usingFixtures]);

  return {
    apiOnline,
    usingFixtures,
    dataSource,
    loading,
    notice,
    scenes,
    tasks,
    integrations,
    runs,
    selectedScene,
    selectedTask,
    setSelectedScene,
    setSelectedTask,
    activeRun,
    selectRun,
    currentStep,
    setCurrentStep,
    metrics,
    submittedCommand,
    runLoop,
    resetLoop,
    refresh,
  };
}
