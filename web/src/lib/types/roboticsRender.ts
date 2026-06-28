import type { GripperType, RobotType, TaskType } from './inspector';
import type {
  LoopStepId,
  PreviewViewMode,
  RenderMarker,
  SceneObjectData,
  TargetZoneData,
  TrajectoryPoint,
  Vec3,
  WorldRenderData,
} from './worldRender';

export type RobotPartType =
  | 'base'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'gripper'
  | 'camera'
  | 'end_effector'
  | 'tool';

export type EndEffectorType =
  | 'two_finger'
  | 'suction'
  | 'clamp'
  | 'camera_probe'
  | 'magnetic'
  | 'custom_tool';

export type SceneObjectKind =
  | 'table'
  | 'mug'
  | 'bowl'
  | 'block'
  | 'drawer'
  | 'handle'
  | 'package'
  | 'bin'
  | 'peg'
  | 'hole'
  | 'obstacle'
  | 'path'
  | 'annotation'
  | 'target'
  | 'robot'
  | 'gripper';

export type MarkerSeverity = 'info' | 'warning' | 'error' | 'success';

export interface RobotPartMaterial {
  color: string;
  metalness: number;
  roughness: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface RobotPart {
  id: string;
  type: RobotPartType;
  label: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  material: RobotPartMaterial;
  editable: boolean;
}

export interface RobotRenderConfig {
  id: string;
  type: RobotType;
  name: string;
  description: string;
  dof: number;
  endEffector: EndEffectorType;
  sensors: string[];
  pose: Vec3 & { roll: number; pitch: number; yaw: number };
  status: string;
  supportedTasks: TaskType[];
  parts: RobotPart[];
  basePosition: Vec3;
  gripperPosition: Vec3;
  gripperOpen: number;
  safetyMode: string;
}

export interface TaskScene {
  id: string;
  taskType: TaskType;
  instruction: string;
  objects: SceneObjectData[];
  targetZones: TargetZoneData[];
  obstacles: SceneObjectData[];
  trajectory: TrajectoryPoint[];
  compareTrajectory?: TrajectoryPoint[];
  markers: RenderMarker[];
  cameraMode: PreviewViewMode;
}

export interface RenderMarkerData {
  id: string;
  type: 'failure' | 'success' | 'warning';
  position: Vec3;
  label: string;
  severity: MarkerSeverity;
  frameIndex: number;
  pulse?: boolean;
}

export interface BuildRenderSceneInput {
  sceneId: string;
  sceneName: string;
  robotType: RobotType;
  gripperType: GripperType;
  taskType: TaskType;
  instruction: string;
  targetObject: string;
  approachHeight: number;
  gripperWidth: number;
  robotStatus: string;
  currentStep: LoopStepId;
  viewMode: PreviewViewMode;
  inspectorSection?: string;
  policyVersion: string;
  adapterVersion: string;
  failureCause?: string | null;
  variants?: Array<{ label: string; reason: string }>;
  retestSuccess?: boolean;
  initialFailed?: boolean;
  showCurriculumVariants?: boolean;
  compareTrajectories?: boolean;
}

export interface RoboticsViewportData extends WorldRenderData {
  robotConfig: RobotRenderConfig;
  taskScene: TaskScene;
}

/** Rerun-compatible stream names for future telemetry wiring */
export const RERUN_STREAMS = {
  robotPose: 'robot/pose',
  objectPose: 'world/objects',
  trajectory: 'robot/trajectory',
  gripper: 'robot/gripper',
  failure: 'events/failure',
  success: 'events/success',
  critic: 'events/critic',
  policy: 'meta/policy',
  camera: 'sensor/camera',
} as const;
