"""Rollout harness (SPL-9 / A3): N rollouts -> a stable success rate.

A single rollout gives a yes/no. The curve needs a *rate*: run the policy across
N sampled task variations and report the fraction it solves. Here the variation is
a random mug displacement; the policy aims at where it believes the mug is (the
nominal origin) and its grasp tolerance comes from `gripper_width_m`. So a better
(wider / better-trained) policy succeeds across more displacements -> higher rate.
That single number per policy is the y-value the self-improvement curve plots.
"""

from __future__ import annotations

import random

from pydantic import BaseModel

from splatforge.models import PolicyVersion, SceneSpec, TaskSpec
from splatforge.simulation.base import SimulationBackend


class RolloutRecord(BaseModel):
    index: int
    mug_x_m: float
    mug_y_m: float
    grasped: bool
    mug_lift_m: float
    success: bool


class SuccessRateReport(BaseModel):
    policy_version: str
    scene_id: str
    task: str
    n_rollouts: int
    successes: int
    success_rate: float
    spread_m: float
    seed: int
    records: list[RolloutRecord]


def evaluate_policy(
    scene: SceneSpec,
    task: TaskSpec,
    policy: PolicyVersion,
    backend: SimulationBackend,
    *,
    n_rollouts: int = 30,
    spread_m: float = 0.10,
    seed: int = 0,
) -> SuccessRateReport:
    """Run `n_rollouts` displaced-mug rollouts and aggregate the success rate.

    Deterministic for a given `seed` so a checkpoint's rate is reproducible.
    """
    if n_rollouts < 1:
        raise ValueError("n_rollouts must be >= 1")

    rng = random.Random(seed)
    successes = 0
    records: list[RolloutRecord] = []

    for i in range(n_rollouts):
        mug_x = rng.uniform(-spread_m, spread_m)
        scene_i = scene.model_copy(
            update={"metadata": {**scene.metadata, "mug_xy": [mug_x, 0.0]}}
        )
        # Policy aims at its belief (nominal origin); competence = gripper width.
        attempt_policy = policy.model_copy(
            update={
                "parameters": {
                    **policy.parameters,
                    "grasp_target_x_m": 0.0,
                    "grasp_target_y_m": 0.0,
                }
            }
        )
        episode = backend.run_episode(scene_i, task, attempt_policy)
        metrics = episode.observation.physics_metrics
        success = bool(metrics["success"])
        successes += int(success)
        records.append(
            RolloutRecord(
                index=i,
                mug_x_m=round(mug_x, 4),
                mug_y_m=0.0,
                grasped=bool(metrics["grasped"]),
                mug_lift_m=float(metrics["mug_lift_m"]),
                success=success,
            )
        )

    return SuccessRateReport(
        policy_version=policy.policy_version,
        scene_id=scene.scene_id,
        task=task.name,
        n_rollouts=n_rollouts,
        successes=successes,
        success_rate=round(successes / n_rollouts, 4),
        spread_m=spread_m,
        seed=seed,
        records=records,
    )
