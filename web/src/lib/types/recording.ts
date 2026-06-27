export interface Transform {
  position: number[];
  rotation: number[];
  scale: number[];
}

export interface SceneObject {
  id: string;
  type: string;
  label: string;
  transform: Transform;
  material: {
    color: number[];
    opacity: number;
    wireframe: boolean;
    highlight: boolean;
  };
  status: string;
  path?: number[][] | null;
  contact_points?: number[][] | null;
}

export interface SceneFrame {
  scene_id: string;
  run_id: string;
  frame_index: number;
  timestamp: string;
  step: string;
  objects: SceneObject[];
  decision_log?: string | null;
  annotations?: Record<string, unknown>;
}

export interface RunMetadata {
  run_id: string;
  scene_id: string;
  task: string;
  backend: string;
  created_at: string;
  frame_count: number;
  timeline: string[];
  decision_log: string[];
  initial_status?: string | null;
  retest_status?: string | null;
  failure_cause?: string | null;
}

export interface RecordingSummary {
  run_id: string;
  scene_id: string | null;
  task: string | null;
  frame_count: number;
  timeline: string[];
}
