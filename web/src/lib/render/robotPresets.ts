import type { GripperType, RobotType, TaskType } from '../types/inspector';
import type { EndEffectorType, RobotRenderConfig } from '../types/roboticsRender';
import type { Vec3 } from '../types/worldRender';

export const RENDER_COLORS = {
  background: '#030407',
  grid: '#1b2430',
  gridFade: '#0d1218',
  table: '#20242d',
  robotMetal: '#2a303b',
  robotAccent: '#4ba3ff',
  trajectory: '#4ba3ff',
  trajectoryGlow: '#6ec8ff',
  targetZone: '#3dd9e8',
  failure: '#c94a5a',
  success: '#4caf82',
} as const;

export interface RobotPreset {
  id: RobotType;
  name: string;
  description: string;
  dof: number;
  defaultEndEffector: EndEffectorType;
  supportedTasks: TaskType[];
  basePosition: Vec3;
  segmentScale: [number, number, number];
  accent: string;
  metal: string;
}

export const ROBOT_PRESETS: Record<RobotType, RobotPreset> = {
  table_arm: {
    id: 'table_arm',
    name: 'Industrial arm',
    description: '6-DOF fixed-base manipulator for tabletop workcells.',
    dof: 6,
    defaultEndEffector: 'two_finger',
    supportedTasks: ['pick_object', 'move_to_target', 'stack_blocks', 'recover_grasp', 'assemble_object'],
    basePosition: { x: -0.48, y: 0, z: -0.14 },
    segmentScale: [1, 1, 1],
    accent: RENDER_COLORS.robotAccent,
    metal: RENDER_COLORS.robotMetal,
  },
  mobile_manipulator: {
    id: 'mobile_manipulator',
    name: 'Mobile manipulator',
    description: 'Holonomic base with 7-DOF arm for navigation + manipulation.',
    dof: 7,
    defaultEndEffector: 'two_finger',
    supportedTasks: ['navigate_target', 'avoid_obstacle', 'pick_object', 'move_to_target'],
    basePosition: { x: -0.65, y: 0, z: -0.35 },
    segmentScale: [1.05, 1.08, 1.05],
    accent: '#5ecfff',
    metal: '#2e3542',
  },
  warehouse_picker: {
    id: 'warehouse_picker',
    name: 'Warehouse picker',
    description: 'Gantry-style picker for structured aisles and totes.',
    dof: 4,
    defaultEndEffector: 'suction',
    supportedTasks: ['pick_object', 'sort_objects', 'move_to_target'],
    basePosition: { x: -0.55, y: 0.15, z: -0.2 },
    segmentScale: [0.9, 1.35, 0.9],
    accent: '#7eb8ff',
    metal: '#323845',
  },
  drone_inspection: {
    id: 'drone_inspection',
    name: 'Drone inspection',
    description: 'Aerial platform with stabilized camera probe.',
    dof: 6,
    defaultEndEffector: 'camera_probe',
    supportedTasks: ['inspect_object', 'scan_environment', 'avoid_obstacle'],
    basePosition: { x: 0.05, y: 0.85, z: 0.1 },
    segmentScale: [0.6, 0.6, 0.6],
    accent: '#68d4ff',
    metal: '#3a404c',
  },
  humanoid_upper: {
    id: 'humanoid_upper',
    name: 'Humanoid upper body',
    description: 'Dual-arm torso for dexterous bimanual tasks.',
    dof: 14,
    defaultEndEffector: 'two_finger',
    supportedTasks: ['assemble_object', 'open_drawer', 'pick_object', 'inspect_object'],
    basePosition: { x: 0, y: 0.35, z: -0.45 },
    segmentScale: [1.1, 1.15, 1.1],
    accent: '#4ba3ff',
    metal: '#2c313c',
  },
  rover_arm: {
    id: 'rover_arm',
    name: 'Rover arm',
    description: 'Field rover with mounted manipulator for uneven terrain.',
    dof: 8,
    defaultEndEffector: 'clamp',
    supportedTasks: ['navigate_target', 'inspect_object', 'recover_grasp'],
    basePosition: { x: -0.7, y: 0.08, z: -0.42 },
    segmentScale: [1.2, 0.95, 1.2],
    accent: '#5a9fd4',
    metal: '#353b47',
  },
  custom: {
    id: 'custom',
    name: 'Custom robot',
    description: 'Modular kinematic chain with user-defined tooling.',
    dof: 6,
    defaultEndEffector: 'custom_tool',
    supportedTasks: ['pick_object', 'inspect_object', 'assemble_object'],
    basePosition: { x: -0.45, y: 0, z: -0.12 },
    segmentScale: [1, 1, 1],
    accent: RENDER_COLORS.robotAccent,
    metal: RENDER_COLORS.robotMetal,
  },
};

export function gripperToEndEffector(gripper: GripperType): EndEffectorType {
  const map: Record<GripperType, EndEffectorType> = {
    parallel_jaw: 'two_finger',
    vacuum: 'suction',
    soft_gripper: 'clamp',
    magnetic: 'magnetic',
    tool_changer: 'custom_tool',
  };
  return map[gripper];
}

export function buildRobotRenderConfig(
  robotType: RobotType,
  gripperType: GripperType,
  gripperPosition: Vec3,
  gripperOpen: number,
  status: string,
  pose: { x: number; y: number; z: number; roll: number; pitch: number; yaw: number },
  safetyMode: string,
): RobotRenderConfig {
  const preset = ROBOT_PRESETS[robotType];
  const endEffector = gripperToEndEffector(gripperType);

  return {
    id: `robot_${robotType}`,
    type: robotType,
    name: preset.name,
    description: preset.description,
    dof: preset.dof,
    endEffector,
    sensors: robotType === 'drone_inspection' ? ['rgb_camera', 'depth'] : ['wrist_camera', 'force_torque'],
    pose: { ...pose },
    status,
    supportedTasks: preset.supportedTasks,
    basePosition: preset.basePosition,
    gripperPosition,
    gripperOpen,
    safetyMode,
    parts: [
      {
        id: 'base',
        type: 'base',
        label: 'Base',
        position: preset.basePosition,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        material: { color: preset.metal, metalness: 0.55, roughness: 0.42 },
        editable: true,
      },
      {
        id: 'shoulder',
        type: 'shoulder',
        label: 'Shoulder',
        position: { x: preset.basePosition.x, y: preset.basePosition.y + 0.22, z: preset.basePosition.z },
        rotation: { x: 0, y: pose.yaw, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        material: { color: preset.metal, metalness: 0.5, roughness: 0.45, emissive: preset.accent, emissiveIntensity: 0.08 },
        editable: true,
      },
      {
        id: 'gripper',
        type: 'gripper',
        label: 'Gripper',
        position: gripperPosition,
        rotation: { x: pose.pitch, y: pose.yaw, z: pose.roll },
        scale: { x: 1, y: 1, z: 1 },
        material: { color: '#d0d6e0', metalness: 0.35, roughness: 0.32 },
        editable: true,
      },
    ],
  };
}
