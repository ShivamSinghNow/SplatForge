from __future__ import annotations

from splatforge.models import Observation, RobotAction, SceneSpec, TaskSpec
from splatforge.robot.base import RobotAdapter


class DryRunRobotAdapter(RobotAdapter):
    name = "dry-run"

    def __init__(self, forced_failure: bool = True) -> None:
        self.forced_failure = forced_failure
        self.actions: list[RobotAction] = []

    def observe(self, scene: SceneSpec, task: TaskSpec) -> Observation:
        return Observation(
            robot_state={
                "adapter": self.name,
                "arm_pose": "home",
                "gripper_open": True,
                "task": task.name,
            },
            scene_state={
                "scene": scene.scene_id,
                "object": task.object_name,
                "goal": task.goal,
            },
            physics_metrics={
                "gripper_height_error_m": 0.09 if self.forced_failure else 0.01,
                "contact_count": 0 if self.forced_failure else 2,
                "slip_velocity_mps": 0.0,
                "handle_occluded": True if self.forced_failure else False,
                "unsafe_collision": False,
            },
        )

    def execute_action(self, action: RobotAction) -> None:
        self.actions.append(action)

    def reset(self) -> None:
        self.actions.clear()

    def emergency_stop(self) -> None:
        self.actions.clear()
