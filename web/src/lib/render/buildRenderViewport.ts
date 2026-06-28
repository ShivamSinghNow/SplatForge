import type { InspectorViewModel } from '../types/inspector';
import type { RunSummary } from '../api/types';
import type { PreviewViewMode } from '../types/worldRender';
import type { LoopStepId } from '../types/splatforge';
import {
  buildTaskScene,
  inspectorSectionComparesPolicy,
  inspectorSectionShowsVariants,
} from './taskSceneBuilder';

export interface BuildRenderViewportInput {
  activeRun: RunSummary | null;
  sceneId: string;
  sceneName: string;
  currentStep: LoopStepId;
  inspector: InspectorViewModel;
  inspectorSection?: string;
  viewMode?: PreviewViewMode;
}

export function buildRenderViewport(input: BuildRenderViewportInput) {
  const { robot, task, mission } = input.inspector;
  const policyVersion =
    input.activeRun?.retest?.policy_version ??
    input.activeRun?.initial_attempt.policy_version ??
    mission.policyVersion;
  const adapterVersion =
    input.activeRun?.retest?.policy_version ??
    input.activeRun?.initial_attempt.policy_version ??
    mission.adapterVersion;

  return buildTaskScene({
    sceneId: input.sceneId,
    sceneName: input.sceneName,
    robotType: robot.robotType,
    gripperType: robot.gripperType,
    taskType: task.taskType,
    instruction: task.instruction,
    targetObject: task.targetObject,
    approachHeight: robot.approachHeight,
    gripperWidth: robot.gripperWidth,
    robotStatus: robot.status,
    currentStep: input.currentStep,
    viewMode: input.viewMode ?? 'live',
    inspectorSection: input.inspectorSection,
    policyVersion,
    adapterVersion,
    failureCause: input.activeRun?.failure_cause,
    variants: input.activeRun?.variants.map((v) => ({ label: v.label, reason: v.reason })),
    retestSuccess: input.activeRun?.retest?.status === 'success',
    initialFailed: input.activeRun?.initial_attempt.status === 'failure',
    showCurriculumVariants: inspectorSectionShowsVariants(input.inspectorSection),
    compareTrajectories:
      inspectorSectionComparesPolicy(input.inspectorSection) || input.viewMode === 'retest_compare',
  });
}

export { mapTimelineToStep, scoreFromRun } from './mapPreviewFromRun';
