import type { TaskType } from '../types/inspector';
import type { BuildRenderSceneInput, RoboticsViewportData, TaskScene } from '../types/roboticsRender';
import type {
  LoopStepId,
  PreviewViewMode,
  RenderMarker,
  SceneObjectData,
  TargetZoneData,
  TrajectoryPoint,
  Vec3,
  WorldRenderData,
} from '../types/worldRender';
import { DEFAULT_CAMERA_PRESETS } from '../types/worldRender';
import { buildRobotRenderConfig, ROBOT_PRESETS, RENDER_COLORS } from './robotPresets';

function rgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function tableObject(): SceneObjectData {
  return {
    id: 'table',
    type: 'table',
    label: 'work surface',
    position: { x: 0, y: -0.05, z: 0.05 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1.35, y: 0.1, z: 1.05 },
    status: 'stable',
    material: { color: rgb(RENDER_COLORS.table), opacity: 1, wireframe: false, highlight: false, roughness: 0.82 },
  };
}

function makePath(points: Vec3[]): TrajectoryPoint[] {
  return points.map((position, index) => ({
    position,
    timestamp: index,
    status: index === points.length - 1 ? 'moving' : 'planned',
    frameIndex: index,
  }));
}

function pickPlacePath(approachHeight: number): Vec3[] {
  const h = approachHeight;
  return [
    { x: -0.2, y: 0.45 + h * 0.5, z: -0.05 },
    { x: 0.0, y: 0.32 + h, z: 0.02 },
    { x: 0.22, y: 0.24 + h, z: 0.04 },
    { x: 0.34, y: 0.18 + h * 0.5, z: 0.02 },
    { x: 0.52, y: 0.22 + h * 0.4, z: 0.26 },
  ];
}

function stackPath(): Vec3[] {
  return [
    { x: -0.15, y: 0.4, z: -0.08 },
    { x: 0.1, y: 0.28, z: 0.0 },
    { x: 0.28, y: 0.2, z: 0.12 },
    { x: 0.38, y: 0.26, z: 0.22 },
    { x: 0.38, y: 0.34, z: 0.22 },
  ];
}

function drawerPath(): Vec3[] {
  return [
    { x: -0.1, y: 0.35, z: 0.2 },
    { x: 0.15, y: 0.22, z: 0.28 },
    { x: 0.22, y: 0.18, z: 0.35 },
    { x: 0.38, y: 0.16, z: 0.35 },
    { x: 0.52, y: 0.16, z: 0.35 },
  ];
}

function navPath(): Vec3[] {
  return [
    { x: -0.6, y: 0.12, z: -0.35 },
    { x: -0.35, y: 0.12, z: -0.15 },
    { x: -0.1, y: 0.12, z: 0.05 },
    { x: 0.15, y: 0.12, z: 0.2 },
    { x: 0.35, y: 0.12, z: 0.32 },
  ];
}

function scanPath(): Vec3[] {
  return [
    { x: -0.4, y: 0.55, z: 0.0 },
    { x: -0.15, y: 0.5, z: 0.15 },
    { x: 0.1, y: 0.48, z: 0.0 },
    { x: 0.35, y: 0.5, z: -0.15 },
    { x: 0.5, y: 0.52, z: 0.0 },
  ];
}

function objectForTarget(name: string, position: Vec3): SceneObjectData {
  const lower = name.toLowerCase();
  if (lower.includes('block') || lower === 'part') {
    return {
      id: 'target_obj',
      type: 'block',
      label: name,
      position,
      rotation: { x: 0, y: 0.2, z: 0 },
      scale: { x: 0.12, y: 0.12, z: 0.12 },
      status: 'target',
      material: { color: [168, 176, 192], opacity: 1, wireframe: false, highlight: true, roughness: 0.55 },
    };
  }
  if (lower.includes('box') || lower.includes('package')) {
    return {
      id: 'target_obj',
      type: 'block',
      label: name,
      position,
      rotation: { x: 0, y: 0.4, z: 0 },
      scale: { x: 0.18, y: 0.12, z: 0.14 },
      status: 'target',
      material: { color: [142, 148, 158], opacity: 1, wireframe: false, highlight: false, roughness: 0.7 },
    };
  }
  if (lower.includes('bowl')) {
    return {
      id: 'target_obj',
      type: 'bowl',
      label: name,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      status: 'target',
      material: { color: [90, 96, 108], opacity: 1, wireframe: false, highlight: false, roughness: 0.65 },
    };
  }
  return {
    id: 'target_obj',
    type: 'mug',
    label: name,
    position,
    rotation: { x: 0, y: 0.35, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    status: 'target',
    material: { color: [198, 204, 214], opacity: 1, wireframe: false, highlight: true, roughness: 0.4 },
  };
}

function targetZone(id: string, position: Vec3, scale: Vec3, label: string): TargetZoneData {
  return { id, label, position, scale, active: true };
}

function buildTaskLayout(taskType: TaskType, targetObject: string, approachHeight: number) {
  const objects: SceneObjectData[] = [tableObject()];
  const targetZones: TargetZoneData[] = [];
  const obstacles: SceneObjectData[] = [];
  let trajectory = makePath(pickPlacePath(approachHeight));
  let gripperIndex = 3;

  switch (taskType) {
    case 'stack_blocks': {
      objects.push(
        objectForTarget('block_a', { x: 0.2, y: 0.06, z: -0.05 }),
        {
          id: 'block_b',
          type: 'block',
          label: 'block_b',
          position: { x: 0.32, y: 0.06, z: 0.02 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.1, y: 0.1, z: 0.1 },
          status: 'planned',
          material: { color: [120, 140, 180], opacity: 1, wireframe: false, highlight: false, roughness: 0.6 },
        },
        {
          id: 'block_c',
          type: 'block',
          label: 'block_c',
          position: { x: 0.12, y: 0.06, z: 0.08 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.1, y: 0.1, z: 0.1 },
          status: 'planned',
          material: { color: [180, 140, 120], opacity: 1, wireframe: false, highlight: false, roughness: 0.6 },
        },
      );
      targetZones.push(targetZone('stack', { x: 0.42, y: 0.02, z: 0.24 }, { x: 0.16, y: 0.02, z: 0.16 }, 'stack target'));
      trajectory = makePath(stackPath());
      gripperIndex = 4;
      break;
    }
    case 'open_drawer': {
      objects.push({
        id: 'cabinet',
        type: 'block',
        label: 'cabinet',
        position: { x: 0.38, y: 0.12, z: 0.32 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.35, y: 0.28, z: 0.22 },
        status: 'stable',
        material: { color: [48, 52, 62], opacity: 1, wireframe: false, highlight: false, roughness: 0.75 },
      });
      objects.push({
        id: 'handle',
        type: 'obstacle',
        label: 'drawer handle',
        position: { x: 0.48, y: 0.14, z: 0.42 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.08, y: 0.02, z: 0.04 },
        status: 'target',
        material: { color: [180, 186, 198], opacity: 1, wireframe: false, highlight: true, roughness: 0.35 },
      });
      trajectory = makePath(drawerPath());
      gripperIndex = 3;
      break;
    }
    case 'inspect_object':
    case 'scan_environment': {
      objects.push(objectForTarget(targetObject, { x: 0.28, y: 0.1, z: 0.08 }));
      targetZones.push(targetZone('inspect', { x: 0.28, y: 0.02, z: 0.08 }, { x: 0.2, y: 0.02, z: 0.2 }, 'inspect zone'));
      trajectory = makePath(scanPath());
      gripperIndex = 2;
      break;
    }
    case 'sort_objects': {
      objects.push(
        objectForTarget('red_part', { x: 0.18, y: 0.07, z: -0.02 }),
        {
          id: 'blue_part',
          type: 'block',
          label: 'blue_part',
          position: { x: 0.26, y: 0.07, z: 0.06 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.08, y: 0.08, z: 0.08 },
          status: 'planned',
          material: { color: [80, 120, 200], opacity: 1, wireframe: false, highlight: false, roughness: 0.5 },
        },
      );
      targetZones.push(
        targetZone('bin_a', { x: 0.52, y: 0.02, z: -0.05 }, { x: 0.14, y: 0.02, z: 0.14 }, 'bin A'),
        targetZone('bin_b', { x: 0.52, y: 0.02, z: 0.28 }, { x: 0.14, y: 0.02, z: 0.14 }, 'bin B'),
      );
      trajectory = makePath(pickPlacePath(approachHeight));
      break;
    }
    case 'navigate_target':
    case 'avoid_obstacle': {
      obstacles.push({
        id: 'obstacle_1',
        type: 'obstacle',
        label: 'obstacle',
        position: { x: 0.05, y: 0.08, z: 0.12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.18, y: 0.22, z: 0.12 },
        status: 'stable',
        material: { color: [60, 68, 82], opacity: 0.9, wireframe: false, highlight: false, roughness: 0.8 },
      });
      targetZones.push(targetZone('nav_goal', { x: 0.42, y: 0.02, z: 0.35 }, { x: 0.2, y: 0.02, z: 0.2 }, 'nav goal'));
      trajectory = makePath(navPath());
      gripperIndex = 4;
      break;
    }
    case 'assemble_object': {
      objects.push(
        {
          id: 'peg',
          type: 'block',
          label: 'peg',
          position: { x: 0.22, y: 0.08, z: 0.02 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.04, y: 0.14, z: 0.04 },
          status: 'target',
          material: { color: [170, 175, 185], opacity: 1, wireframe: false, highlight: true, roughness: 0.4 },
        },
        {
          id: 'hole',
          type: 'obstacle',
          label: 'hole fixture',
          position: { x: 0.48, y: 0.07, z: 0.22 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.12, y: 0.06, z: 0.12 },
          status: 'planned',
          material: { color: [50, 55, 65], opacity: 1, wireframe: true, highlight: false, roughness: 0.7 },
        },
      );
      targetZones.push(targetZone('mate', { x: 0.48, y: 0.02, z: 0.22 }, { x: 0.14, y: 0.02, z: 0.14 }, 'mate zone'));
      trajectory = makePath(pickPlacePath(approachHeight * 0.8));
      break;
    }
    case 'recover_grasp': {
      objects.push(objectForTarget(targetObject, { x: 0.3, y: 0.1, z: 0.02 }));
      targetZones.push(targetZone('goal', { x: 0.55, y: 0.02, z: 0.28 }, { x: 0.2, y: 0.02, z: 0.18 }, 'goal zone'));
      const retry = pickPlacePath(approachHeight);
      retry.splice(2, 0, { x: 0.26, y: 0.12, z: 0.0 });
      trajectory = makePath(retry);
      gripperIndex = 3;
      break;
    }
    default: {
      objects.push(objectForTarget(targetObject, { x: 0.32, y: 0.1, z: 0.02 }));
      targetZones.push(targetZone('goal', { x: 0.55, y: 0.02, z: 0.28 }, { x: 0.22, y: 0.02, z: 0.18 }, 'goal zone'));
      trajectory = makePath(pickPlacePath(approachHeight));
      break;
    }
  }

  return { objects, targetZones, obstacles, trajectory, gripperIndex };
}

function viewModeFromInspector(section?: string, requested?: PreviewViewMode): PreviewViewMode {
  if (requested && requested !== 'live') {
    return requested;
  }
  switch (section) {
    case 'memory':
      return 'failure_analysis';
    case 'curriculum':
      return 'training_worlds';
    case 'policy':
      return 'retest_compare';
    case 'robot':
      return 'robot_edit';
    case 'task':
      return 'task_preview';
    default:
      return 'live';
  }
}

function buildMarkers(input: BuildRenderSceneInput, gripperPos: Vec3, goalPos: Vec3): RenderMarker[] {
  const markers: RenderMarker[] = [];
  const pulseFail = ['critique', 'curriculum', 'train', 'attempt'].includes(input.currentStep);
  const pulseSuccess = ['retest', 'improve'].includes(input.currentStep);

  if (input.initialFailed && input.failureCause) {
    markers.push({
      type: 'failure',
      position: { x: gripperPos.x - 0.02, y: gripperPos.y - 0.08, z: gripperPos.z },
      label: input.failureCause.slice(0, 48),
      frameIndex: 0,
      pulse: pulseFail || input.inspectorSection === 'memory',
    });
  }
  if (input.retestSuccess) {
    markers.push({
      type: 'success',
      position: { x: goalPos.x, y: goalPos.y + 0.08, z: goalPos.z },
      label: 'retest success',
      frameIndex: 0,
      pulse: pulseSuccess || input.inspectorSection === 'policy',
    });
  }
  if (input.taskType === 'recover_grasp' && input.initialFailed) {
    markers.push({
      type: 'warning',
      position: gripperPos,
      label: 'retry approach',
      frameIndex: 1,
      pulse: true,
    });
  }
  return markers;
}

export function buildTaskScene(input: BuildRenderSceneInput): RoboticsViewportData {
  const preset = ROBOT_PRESETS[input.robotType];
  const layout = buildTaskLayout(input.taskType, input.targetObject, input.approachHeight);
  const gripperPos = layout.trajectory[layout.gripperIndex]?.position ?? layout.trajectory[layout.trajectory.length - 1]!.position;
  const goalPos = layout.targetZones[0]?.position ?? { x: 0.5, y: 0.1, z: 0.28 };

  if (input.showCurriculumVariants && input.variants?.length) {
    input.variants.forEach((variant, index) => {
      layout.obstacles.push({
        id: `variant_${index}`,
        type: 'obstacle',
        label: variant.label,
        position: { x: 0.14 + index * 0.1, y: 0.08, z: 0.14 + index * 0.04 },
        rotation: { x: 0, y: 0.3 * index, z: 0 },
        scale: { x: 0.1, y: 0.14, z: 0.1 },
        status: 'planned',
        material: { color: [75, 163, 255], opacity: 0.65, wireframe: true, highlight: true, roughness: 0.5 },
      });
    });
  }

  const allObjects = [...layout.objects, ...layout.obstacles];
  const markers = buildMarkers(input, gripperPos, goalPos);
  const compareTrajectory =
    input.compareTrajectories && layout.trajectory.length > 1
      ? layout.trajectory.map((point, index) => ({
          ...point,
          position: {
            x: point.position.x + 0.04,
            y: point.position.y + (index % 2 === 0 ? 0.02 : -0.01),
            z: point.position.z + 0.03,
          },
        }))
      : undefined;

  const robotConfig = buildRobotRenderConfig(
    input.robotType,
    input.gripperType,
    gripperPos,
    Math.min(0.85, input.gripperWidth * 8),
    input.robotStatus,
    { x: gripperPos.x, y: gripperPos.y, z: gripperPos.z, roll: 0, pitch: -0.5, yaw: 0.35 },
    'standard',
  );

  const viewMode = viewModeFromInspector(input.inspectorSection, input.viewMode);

  const taskScene: TaskScene = {
    id: `${input.sceneId}_${input.taskType}`,
    taskType: input.taskType,
    instruction: input.instruction,
    objects: allObjects,
    targetZones: layout.targetZones,
    obstacles: layout.obstacles,
    trajectory: layout.trajectory,
    compareTrajectory,
    markers,
    cameraMode: viewMode,
  };

  const world: WorldRenderData = {
    worldId: input.sceneId,
    name: input.sceneName.replace(/_/g, ' '),
    objects: allObjects,
    robot: {
      basePosition: preset.basePosition,
      joints: [0.35, -0.55, 0.25],
      gripperPosition: gripperPos,
      gripperOpen: Math.min(0.85, input.gripperWidth * 8),
      status: input.robotStatus === 'error' ? 'failed' : input.robotStatus === 'moving' ? 'moving' : 'planned',
      path: layout.trajectory.map((point) => point.position),
    },
    targetZones: layout.targetZones,
    trajectory: layout.trajectory,
    compareTrajectory,
    markers,
    cameraPresets: DEFAULT_CAMERA_PRESETS,
    currentFrame: layout.gripperIndex,
    frameCount: layout.trajectory.length,
    currentLoopStep: input.currentStep,
    currentStepLabel: input.currentStep,
    policyVersion: input.policyVersion,
    adapterVersion: input.adapterVersion,
    decisionLog: input.failureCause ?? undefined,
  };

  return { ...world, robotConfig, taskScene };
}

export function inspectorSectionShowsVariants(section?: string): boolean {
  return section === 'curriculum';
}

export function inspectorSectionComparesPolicy(section?: string): boolean {
  return section === 'policy';
}
