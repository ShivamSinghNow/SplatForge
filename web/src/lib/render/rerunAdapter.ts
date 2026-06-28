import type { SceneFrame } from '../types/recording';
import type { RoboticsViewportData } from '../types/roboticsRender';
import { RERUN_STREAMS } from '../types/roboticsRender';
import { buildWorldRenderData } from './frameAdapter';

/**
 * Boundary for Rerun telemetry ingestion.
 * Map recording frames or live streams into the viewport model.
 */
export function viewportFromRecordingFrames(
  frames: SceneFrame[],
  frameIndex: number,
): RoboticsViewportData {
  const world = buildWorldRenderData(frames, frameIndex, null, 'replay');
  return {
    ...world,
    robotConfig: {
      id: 'robot_replay',
      type: 'table_arm',
      name: 'Replay robot',
      description: 'Loaded from recorded frames',
      dof: 6,
      endEffector: 'two_finger',
      sensors: ['wrist_camera'],
      pose: { x: world.robot.gripperPosition.x, y: world.robot.gripperPosition.y, z: world.robot.gripperPosition.z, roll: 0, pitch: 0, yaw: 0 },
      status: world.robot.status,
      supportedTasks: ['pick_object'],
      basePosition: world.robot.basePosition,
      gripperPosition: world.robot.gripperPosition,
      gripperOpen: world.robot.gripperOpen,
      safetyMode: 'standard',
      parts: [],
    },
    taskScene: {
      id: world.worldId,
      taskType: 'pick_object',
      instruction: world.decisionLog ?? '',
      objects: world.objects,
      targetZones: world.targetZones,
      obstacles: world.objects.filter((obj) => obj.type === 'obstacle'),
      trajectory: world.trajectory,
      compareTrajectory: world.compareTrajectory,
      markers: world.markers,
      cameraMode: 'replay',
    },
  };
}

export function toRerunStreamManifest(data: RoboticsViewportData) {
  return {
    streams: Object.values(RERUN_STREAMS),
    policyVersion: data.policyVersion,
    frame: data.currentFrame,
    frameCount: data.frameCount,
    robotPose: data.robotConfig.pose,
    gripper: data.robot.gripperPosition,
    trajectory: data.trajectory.map((point) => point.position),
    markers: data.markers,
  };
}
