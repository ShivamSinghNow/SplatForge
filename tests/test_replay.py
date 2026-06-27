"""A4 (SPL-10): rollout trajectories persist to the buffer and round-trip."""

from __future__ import annotations

import pytest

from splatforge.models import PolicyVersion, SceneSpec, TaskSpec
from splatforge.orchestrator import ReplayBuffer, evaluate_policy, load_local_trajectories
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend
from splatforge.storage import JsonlRepository

pytestmark = pytest.mark.skipif(
    not MujocoSimulationBackend().is_available(),
    reason="mujoco not installed",
)


def _scene() -> SceneSpec:
    return SceneSpec(scene_id="scene_test", name="test", splat_asset="demo/assets/x.splat")


def _task() -> TaskSpec:
    return TaskSpec(name="pick_up_mug", object_name="mug", goal="lift the mug")


def _policy() -> PolicyVersion:
    return PolicyVersion(policy_version="p_test", parameters={"gripper_width_m": 0.10, "approach_height_m": 0.30})


def test_trajectories_persist_and_round_trip(tmp_path) -> None:
    backend = MujocoSimulationBackend()
    buffer = ReplayBuffer(JsonlRepository(root=tmp_path))

    report = evaluate_policy(
        _scene(), _task(), _policy(), backend,
        n_rollouts=12, seed=3, replay=buffer, run_id="r1", iteration=2,
    )

    reloaded = load_local_trajectories(root=tmp_path)

    assert buffer.written == 12
    assert len(reloaded) == 12
    # Stored success count matches the report computed in memory.
    assert sum(1 for t in reloaded if t["success"]) == report.successes

    sample = reloaded[0]
    assert sample["run_id"] == "r1"
    assert sample["iteration"] == 2
    assert sample["policy_version"] == "p_test"
    assert len(sample["actions"]) == 1
    assert "mug_xy" in sample["scene"]
    # Open slots for downstream owners (B3 critic, B4 Voyage embedding).
    assert sample["critic"] is None
    assert sample["embedding"] is None


def test_evaluate_without_replay_writes_nothing(tmp_path) -> None:
    backend = MujocoSimulationBackend()
    evaluate_policy(_scene(), _task(), _policy(), backend, n_rollouts=5, seed=0)
    assert load_local_trajectories(root=tmp_path) == []
