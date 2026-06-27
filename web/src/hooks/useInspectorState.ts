import { useEffect, useMemo, useState } from 'react';
import type { FailureRecord, IntegrationStatus, RunSummary, SceneOption, TaskOption } from '../lib/api/types';
import { fetchSimilarFailures } from '../lib/api/client';
import {
  buildInspectorViewModel,
  defaultRobotConfig,
  defaultTaskConfig,
} from '../lib/services/buildInspectorState';
import type {
  CurriculumState,
  InspectorSectionId,
  InspectorViewModel,
  RobotConfig,
  TaskConfig,
} from '../lib/types/inspector';
import type { LoopStepId } from '../lib/types/splatforge';

interface UseInspectorStateInput {
  activeRun: RunSummary | null;
  scenes: SceneOption[];
  tasks: TaskOption[];
  selectedScene: string;
  selectedTask: string;
  selectedTaskDescription: string;
  currentStep: LoopStepId;
  loading: boolean;
  phase: string;
  apiOnline: boolean;
  integrations: IntegrationStatus[];
  scores: { before: number; after: number };
  dataSource: import('../lib/types/dataSource').DataSource;
  isDemo: boolean;
}

export function useInspectorState(input: UseInspectorStateInput) {
  const [activeSection, setActiveSection] = useState<InspectorSectionId>('mission');
  const [robot, setRobot] = useState<RobotConfig>(defaultRobotConfig);
  const [task, setTask] = useState<TaskConfig>(() =>
    defaultTaskConfig(input.selectedScene, input.selectedTask, input.selectedTaskDescription),
  );
  const [similarFailures, setSimilarFailures] = useState<FailureRecord[]>([]);
  const [selectedVariationIds, setSelectedVariationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTask((current) => ({
      ...current,
      sceneId: input.selectedScene,
      taskId: input.selectedTask,
      instruction: current.instruction || input.selectedTaskDescription,
    }));
  }, [input.selectedScene, input.selectedTask, input.selectedTaskDescription]);

  useEffect(() => {
    const query = input.activeRun?.failure_cause ?? input.activeRun?.initial_attempt.summary;
    if (!query || !input.apiOnline) {
      setSimilarFailures([]);
      return;
    }
    void fetchSimilarFailures(query, 5)
      .then((response) => setSimilarFailures(response.results))
      .catch(() => setSimilarFailures([]));
  }, [input.activeRun, input.apiOnline]);

  useEffect(() => {
    if (input.activeRun?.variants.length) {
      setSelectedVariationIds(new Set(input.activeRun.variants.map((_, index) => `var_${index}`).slice(0, 2)));
    }
  }, [input.activeRun?.run_id, input.activeRun?.variants.length]);

  const baseModel = useMemo(
    () =>
      buildInspectorViewModel({
        ...input,
        robot,
        task,
        similarFailures,
        scores: input.scores,
        dataSource: input.dataSource,
        isDemo: input.isDemo,
      }),
    [input, robot, task, similarFailures],
  );

  const model: InspectorViewModel = useMemo(() => {
    const curriculum: CurriculumState = {
      ...baseModel.curriculum,
      variations: baseModel.curriculum.variations.map((variation) => ({
        ...variation,
        selected: selectedVariationIds.has(variation.id),
      })),
      canApply: baseModel.curriculum.variations.some((variation) => selectedVariationIds.has(variation.id)),
    };
    return { ...baseModel, curriculum };
  }, [baseModel, selectedVariationIds]);

  function updateRobot(patch: Partial<RobotConfig>) {
    setRobot((current) => ({ ...current, ...patch }));
  }

  function updateTask(patch: Partial<TaskConfig>) {
    setTask((current) => ({ ...current, ...patch }));
  }

  function toggleVariation(id: string) {
    setSelectedVariationIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return {
    activeSection,
    setActiveSection,
    model,
    robot,
    task,
    updateRobot,
    updateTask,
    toggleVariation,
  };
}

export function mapNavToInspector(section: string): InspectorSectionId | null {
  const map: Record<string, InspectorSectionId> = {
    control: 'mission',
    memory: 'memory',
    council: 'council',
    policy: 'policy',
    health: 'health',
  };
  return map[section] ?? null;
}

export function mapInspectorToNav(section: InspectorSectionId): string | null {
  const map: Record<InspectorSectionId, string> = {
    mission: 'control',
    robot: 'control',
    task: 'control',
    council: 'council',
    curriculum: 'council',
    memory: 'memory',
    policy: 'policy',
    health: 'health',
  };
  return map[section];
}
