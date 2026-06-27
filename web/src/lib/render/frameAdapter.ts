import type { RunMetadata, SceneFrame, SceneObject } from '../types/recording';
import type {
  LoopStepId,
  PreviewViewMode,
  RenderMarker,
  RobotState,
  SceneObjectData,
  SceneObjectType,
  TargetZoneData,
  TrajectoryPoint,
  Vec3,
  WorldRenderData,
} from '../types/worldRender';
import { DEFAULT_CAMERA_PRESETS } from '../types/worldRender';
import { buildDefaultWorld } from './defaultWorld';

function vec3(point: number[]): Vec3 {
  return { x: point[0] ?? 0, y: point[1] ?? 0, z: point[2] ?? 0 };
}

function mapStatus(status: string): SceneObjectData['status'] {
  const normalized = status.toLowerCase();
  if (normalized === 'moving') return 'moving';
  if (normalized === 'collided') return 'collided';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'failed') return 'failed';
  if (normalized === 'target') return 'target';
  return 'planned';
}

function mapObjectType(type: string): SceneObjectType {
  const allowed: SceneObjectType[] = [
    'table',
    'mug',
    'bowl',
    'block',
    'robot',
    'gripper',
    'target',
    'obstacle',
    'path',
    'annotation',
  ];
  return allowed.includes(type as SceneObjectType) ? (type as SceneObjectType) : 'block';
}

function mapSceneObject(obj: SceneObject): SceneObjectData {
  return {
    id: obj.id,
    type: mapObjectType(obj.type),
    label: obj.label,
    position: vec3(obj.transform.position),
    rotation: vec3(obj.transform.rotation),
    scale: vec3(obj.transform.scale),
    status: mapStatus(obj.status),
    material: {
      color: [
        obj.material.color[0] ?? 200,
        obj.material.color[1] ?? 200,
        obj.material.color[2] ?? 200,
      ],
      opacity: obj.material.opacity,
      wireframe: obj.material.wireframe,
      highlight: obj.material.highlight,
    },
    path: obj.path?.map(vec3),
    contactPoints: obj.contact_points?.map(vec3),
  };
}

function stepToLoop(step: string): LoopStepId {
  if (step.startsWith('world')) return 'world';
  if (step.startsWith('attempt')) return 'attempt';
  if (step.startsWith('critique')) return 'critique';
  if (step.startsWith('curriculum')) return 'curriculum';
  if (step.startsWith('train')) return 'train';
  if (step === 'retest_result') return 'improve';
  if (step.startsWith('retest')) return 'retest';
  return 'world';
}

function findGripper(objects: SceneObjectData[]): SceneObjectData | undefined {
  return objects.find((obj) => obj.type === 'gripper');
}

function findRobotBase(objects: SceneObjectData[]): Vec3 {
  const robot = objects.find((obj) => obj.type === 'robot');
  return robot?.position ?? { x: -0.42, y: 0, z: -0.12 };
}

function buildRobotState(objects: SceneObjectData[]): RobotState {
  const gripper = findGripper(objects);
  const base = findRobotBase(objects);
  const gripperPosition = gripper?.position ?? { x: -0.18, y: 0.42, z: -0.08 };
  const openAmount =
    gripper?.status === 'moving' ? 0.55 : gripper?.status === 'completed' ? 0.12 : 0.42;

  return {
    basePosition: base,
    joints: [0.35, -0.55, 0.25],
    gripperPosition,
    gripperOpen: openAmount,
    status: gripper?.status ?? 'planned',
    path: gripper?.path,
  };
}

function extractPathFromFrames(frames: SceneFrame[], stepPrefix: string): Vec3[] {
  for (const frame of frames) {
    if (!frame.step.startsWith(stepPrefix)) {
      continue;
    }
    const gripper = frame.objects.find((obj) => obj.type === 'gripper');
    if (gripper?.path && gripper.path.length > 1) {
      return gripper.path.map(vec3);
    }
    const pathObj = frame.objects.find((obj) => obj.type === 'path');
    if (pathObj?.path && pathObj.path.length > 1) {
      return pathObj.path.map(vec3);
    }
  }
  return [];
}

function toTrajectory(points: Vec3[], frameIndex = 0): TrajectoryPoint[] {
  return points.map((position, index) => ({
    position,
    timestamp: index,
    status: index === points.length - 1 ? 'moving' : 'planned',
    frameIndex,
  }));
}

function extractMarkers(frames: SceneFrame[], currentIndex: number): RenderMarker[] {
  const markers: RenderMarker[] = [];

  frames.forEach((frame, frameIndex) => {
    for (const obj of frame.objects) {
      if (obj.id === 'failure_marker' || (obj.type === 'annotation' && obj.status === 'failed')) {
        markers.push({
          type: 'failure',
          position: vec3(obj.transform.position),
          label: frame.decision_log?.slice(0, 48) ?? 'unstable grasp',
          frameIndex,
          pulse: frameIndex === currentIndex,
        });
      }
    }
    if (frame.step === 'retest_result' && frame.objects.some((obj) => obj.type === 'mug' && obj.status === 'completed')) {
      const mug = frame.objects.find((obj) => obj.type === 'mug');
      if (mug) {
        markers.push({
          type: 'success',
          position: vec3(mug.transform.position),
          label: 'retest success',
          frameIndex,
          pulse: frameIndex === currentIndex,
        });
      }
    }
  });

  const unique = new Map<string, RenderMarker>();
  for (const marker of markers) {
    const key = `${marker.type}:${marker.position.x}:${marker.position.y}:${marker.position.z}`;
    if (!unique.has(key)) {
      unique.set(key, marker);
    }
  }
  return [...unique.values()];
}

function extractPolicy(frames: SceneFrame[]): { policy: string; adapter: string } {
  for (const frame of frames) {
    const policy = frame.annotations?.policy as { policy_version?: string } | undefined;
    if (policy?.policy_version) {
      return { policy: policy.policy_version, adapter: policy.policy_version };
    }
  }
  return { policy: 'policy_v0', adapter: 'adapter_v0' };
}

function filterObjectsForView(
  objects: SceneObjectData[],
  viewMode: PreviewViewMode,
): SceneObjectData[] {
  const withoutTelemetry = objects.filter(
    (obj) =>
      obj.type !== 'path' &&
      obj.type !== 'annotation' &&
      obj.type !== 'robot' &&
      obj.type !== 'gripper' &&
      obj.type !== 'target',
  );

  if (viewMode === 'training_worlds') {
    return withoutTelemetry;
  }
  if (viewMode === 'failure_analysis') {
    return withoutTelemetry.filter((obj) => obj.type !== 'obstacle' || obj.status === 'failed');
  }
  return withoutTelemetry;
}

export function buildWorldRenderData(
  frames: SceneFrame[],
  frameIndex: number,
  metadata: RunMetadata | null,
  viewMode: PreviewViewMode = 'replay',
): WorldRenderData {
  if (frames.length === 0) {
    return buildDefaultWorld();
  }

  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const objects = frame.objects.map(mapSceneObject);
  const visibleObjects = filterObjectsForView(objects, viewMode);
  const robot = buildRobotState(objects);
  const attemptPath = extractPathFromFrames(frames, 'attempt');
  const retestPath = extractPathFromFrames(frames, 'retest');
  const activePath = robot.path?.length ? robot.path : attemptPath;
  const trajectory = toTrajectory(activePath, frameIndex);
  const compareTrajectory =
    viewMode === 'retest_compare' && retestPath.length > 0
      ? toTrajectory(retestPath, frameIndex)
      : undefined;
  const { policy, adapter } = extractPolicy(frames);

  const targetZones: TargetZoneData[] = objects
    .filter((obj) => obj.type === 'target')
    .map((obj) => ({
      id: obj.id,
      label: obj.label,
      position: obj.position,
      scale: obj.scale,
      active: obj.status !== 'failed',
    }));

  return {
    worldId: frame.scene_id,
    name: metadata?.scene_id?.replace('scene_', '').replace(/_/g, ' ') ?? 'training world',
    objects: visibleObjects,
    robot,
    targetZones,
    trajectory,
    compareTrajectory,
    markers: extractMarkers(frames, frameIndex),
    cameraPresets: DEFAULT_CAMERA_PRESETS,
    currentFrame: frameIndex,
    frameCount: frames.length,
    currentLoopStep: stepToLoop(frame.step),
    currentStepLabel: frame.step.replace(/_/g, ' '),
    policyVersion: policy,
    adapterVersion: adapter,
    decisionLog: frame.decision_log ?? metadata?.failure_cause ?? undefined,
  };
}
