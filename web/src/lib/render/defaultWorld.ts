import type { WorldRenderData } from '../types/worldRender';
import { DEFAULT_CAMERA_PRESETS } from '../types/worldRender';

export function buildDefaultWorld(): WorldRenderData {
  const attemptPath = [
    { x: -0.18, y: 0.42, z: -0.08 },
    { x: -0.02, y: 0.34, z: -0.04 },
    { x: 0.14, y: 0.28, z: -0.01 },
    { x: 0.28, y: 0.24, z: 0.0 },
    { x: 0.32, y: 0.22, z: 0.0 },
  ];

  return {
    worldId: 'scene_mug_table',
    name: 'mug table',
    objects: [
      {
        id: 'table',
        type: 'table',
        label: 'table',
        position: { x: 0, y: -0.05, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1.2, y: 0.1, z: 0.8 },
        status: 'stable',
        material: { color: [38, 42, 52], opacity: 1, wireframe: false, highlight: false, roughness: 0.85 },
      },
      {
        id: 'mug',
        type: 'mug',
        label: 'mug',
        position: { x: 0.32, y: 0.1, z: 0 },
        rotation: { x: 0, y: 0.35, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        status: 'target',
        material: { color: [200, 206, 216], opacity: 1, wireframe: false, highlight: false, roughness: 0.42 },
      },
      {
        id: 'target',
        type: 'target',
        label: 'target zone',
        position: { x: 0.55, y: 0.02, z: 0.28 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.22, y: 0.02, z: 0.18 },
        status: 'planned',
        material: { color: [61, 220, 151], opacity: 0.2, wireframe: true, highlight: false },
      },
    ],
    robot: {
      basePosition: { x: -0.42, y: 0, z: -0.12 },
      joints: [0.35, -0.55, 0.25],
      gripperPosition: attemptPath[2],
      gripperOpen: 0.42,
      status: 'moving',
      path: attemptPath,
    },
    targetZones: [
      {
        id: 'target',
        label: 'target zone',
        position: { x: 0.55, y: 0.02, z: 0.28 },
        scale: { x: 0.22, y: 0.02, z: 0.18 },
        active: true,
      },
    ],
    trajectory: attemptPath.map((position, index) => ({
      position,
      timestamp: index,
      status: index === attemptPath.length - 1 ? 'moving' : 'planned',
    })),
    markers: [],
    cameraPresets: DEFAULT_CAMERA_PRESETS,
    currentFrame: 0,
    frameCount: 0,
    currentLoopStep: 'attempt',
    currentStepLabel: 'awaiting run',
    policyVersion: 'policy_v0',
    adapterVersion: 'adapter_v0',
    decisionLog: undefined,
  };
}
