from __future__ import annotations

from splatforge.models import AttemptStatus, Observation, RobotAction, TaskSpec


def build_pick_task(task_name: str) -> TaskSpec:
    if task_name != "pick_mug":
        raise ValueError(f"Unsupported task for MVP: {task_name}")

    return TaskSpec(
        name="pick_mug",
        object_name="mug",
        goal="move mug to marked goal zone",
    )


def propose_action(task: TaskSpec, policy_parameters: dict[str, float]) -> RobotAction:
    return RobotAction(
        command="pick_and_place",
        parameters={
            "object": task.object_name,
            "approach_height_m": policy_parameters.get("approach_height_m", 0.14),
            "pregrasp_offset_x_m": policy_parameters.get("pregrasp_offset_x_m", 0.0),
            "wrist_yaw_deg": policy_parameters.get("wrist_yaw_deg", 0.0),
            "gripper_width_m": policy_parameters.get("gripper_width_m", 0.06),
        },
    )


def evaluate_attempt(observation: Observation) -> AttemptStatus:
    metrics = observation.physics_metrics
    if metrics.get("unsafe_collision"):
        return AttemptStatus.FAILURE
    if float(metrics.get("gripper_height_error_m", 1.0)) > 0.04:
        return AttemptStatus.FAILURE
    if int(metrics.get("contact_count", 0)) < 2:
        return AttemptStatus.FAILURE
    if float(metrics.get("slip_velocity_mps", 0.0)) > 0.04:
        return AttemptStatus.FAILURE
    return AttemptStatus.SUCCESS
