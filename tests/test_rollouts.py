"""A3 (SPL-9): the rollout harness produces a stable, trainable success rate."""

from __future__ import annotations

import pytest

from splatforge.models import PolicyVersion, SceneSpec, TaskSpec
from splatforge.orchestrator import evaluate_policy
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend

pytestmark = pytest.mark.skipif(
    not MujocoSimulationBackend().is_available(),
    reason="mujoco not installed",
)


def _scene() -> SceneSpec:
    return SceneSpec(scene_id="scene_test", name="test", splat_asset="demo/assets/x.splat")


def _task() -> TaskSpec:
    return TaskSpec(name="pick_up_mug", object_name="mug", goal="lift the mug")


def _policy(gripper_width_m: float) -> PolicyVersion:
    return PolicyVersion(
        policy_version=f"p_{gripper_width_m}",
        parameters={"gripper_width_m": gripper_width_m, "approach_height_m": 0.30},
    )


def test_success_rate_is_a_fraction_and_reproducible() -> None:
    backend = MujocoSimulationBackend()
    report_a = evaluate_policy(_scene(), _task(), _policy(0.10), backend, n_rollouts=20, seed=7)
    report_b = evaluate_policy(_scene(), _task(), _policy(0.10), backend, n_rollouts=20, seed=7)

    assert 0.0 <= report_a.success_rate <= 1.0
    assert len(report_a.records) == 20
    assert report_a.successes == sum(r.success for r in report_a.records)
    # Same seed -> identical rate (deterministic).
    assert report_a.success_rate == report_b.success_rate


def test_wider_gripper_does_not_lower_success_rate() -> None:
    backend = MujocoSimulationBackend()
    narrow = evaluate_policy(_scene(), _task(), _policy(0.06), backend, n_rollouts=30, seed=1)
    wide = evaluate_policy(_scene(), _task(), _policy(0.20), backend, n_rollouts=30, seed=1)
    # A better policy solves at least as many sampled displacements -> trainable curve.
    assert wide.success_rate >= narrow.success_rate
