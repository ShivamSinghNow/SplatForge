export type PreviewViewMode =
  | 'live'
  | 'replay'
  | 'failure_analysis'
  | 'training_worlds'
  | 'retest_compare'
  | 'robot_edit'
  | 'task_preview';

export type LoopStepId =
  | 'world'
  | 'attempt'
  | 'critique'
  | 'curriculum'
  | 'train'
  | 'retest'
  | 'improve';

export type ObjectStatus =
  | 'planned'
  | 'moving'
  | 'collided'
  | 'completed'
  | 'failed'
  | 'stable'
  | 'target';

export type SceneObjectType =
  | 'table'
  | 'mug'
  | 'bowl'
  | 'block'
  | 'robot'
  | 'gripper'
  | 'target'
  | 'obstacle'
  | 'path'
  | 'annotation'
  | 'drawer'
  | 'handle'
  | 'package'
  | 'bin'
  | 'peg'
  | 'hole';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SceneObjectMaterial {
  color: [number, number, number];
  opacity: number;
  wireframe: boolean;
  highlight: boolean;
  metalness?: number;
  roughness?: number;
}

export interface SceneObjectData {
  id: string;
  type: SceneObjectType;
  label: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  status: ObjectStatus;
  material: SceneObjectMaterial;
  path?: Vec3[];
  contactPoints?: Vec3[];
}

export interface RobotState {
  basePosition: Vec3;
  joints: [number, number, number];
  gripperPosition: Vec3;
  gripperOpen: number;
  status: ObjectStatus;
  path?: Vec3[];
}

export interface TargetZoneData {
  id: string;
  label: string;
  position: Vec3;
  scale: Vec3;
  active: boolean;
}

export interface TrajectoryPoint {
  position: Vec3;
  timestamp: number;
  status: ObjectStatus;
  frameIndex?: number;
}

export interface RenderMarker {
  type: 'failure' | 'success' | 'warning';
  position: Vec3;
  label: string;
  frameIndex: number;
  pulse?: boolean;
}

export interface CameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface WorldRenderData {
  worldId: string;
  name: string;
  objects: SceneObjectData[];
  robot: RobotState;
  targetZones: TargetZoneData[];
  trajectory: TrajectoryPoint[];
  compareTrajectory?: TrajectoryPoint[];
  markers: RenderMarker[];
  cameraPresets: CameraPreset[];
  currentFrame: number;
  frameCount: number;
  currentLoopStep: LoopStepId;
  currentStepLabel: string;
  policyVersion: string;
  adapterVersion: string;
  decisionLog?: string;
}

export interface PreviewDisplayOptions {
  showLabels: boolean;
  showTrajectory: boolean;
  showFailureMarkers: boolean;
  showSuccessMarkers: boolean;
  showWaypoints: boolean;
  showGrid: boolean;
  showTargetZones: boolean;
  followRobot: boolean;
}

export const DEFAULT_CAMERA_PRESETS: CameraPreset[] = [
  { id: 'cinematic', label: 'Cinematic', position: [2.1, 1.65, 2.05], target: [0.12, 0.12, 0.05] },
  { id: 'top', label: 'Top', position: [0.05, 3.4, 0.02], target: [0.12, 0, 0.05] },
  { id: 'side', label: 'Side', position: [3.1, 1.35, 0.05], target: [0.12, 0.1, 0.05] },
];

export const DEFAULT_DISPLAY_OPTIONS: PreviewDisplayOptions = {
  showLabels: true,
  showTrajectory: true,
  showFailureMarkers: true,
  showSuccessMarkers: true,
  showWaypoints: true,
  showGrid: true,
  showTargetZones: true,
  followRobot: false,
};
