from __future__ import annotations

from splatforge.models import FailureReport, PolicyVersion

DEFAULT_POLICY = PolicyVersion(
    policy_version="policy_v0",
    parameters={
        "approach_height_m": 0.14,
        "pregrasp_offset_x_m": 0.0,
        "wrist_yaw_deg": 0.0,
        "gripper_width_m": 0.06,
        "grasp_force": 0.5,
    },
    notes="Initial hand-tuned grasp policy.",
)


def update_policy(
    current: PolicyVersion,
    report: FailureReport,
    training_episode_ids: list[str],
) -> PolicyVersion:
    parameters = dict(current.parameters)
    for key, value in report.policy_hints.items():
        if not key.endswith("_delta") or not isinstance(value, int | float):
            continue
        parameter_name = key.removesuffix("_delta")
        if parameter_name in parameters:
            parameters[parameter_name] = round(parameters[parameter_name] + float(value), 4)

    return PolicyVersion(
        policy_version=_next_version(current.policy_version),
        source_policy_version=current.policy_version,
        parameters=parameters,
        training_episode_ids=training_episode_ids,
        notes=f"Updated from failure report {report.report_id}: {report.root_cause}",
    )


def _next_version(version: str) -> str:
    prefix, _, suffix = version.rpartition("_v")
    if suffix.isdigit():
        return f"{prefix}_v{int(suffix) + 1}"
    return f"{version}_v1"
