"""A6 (SPL-12): the orchestrator loop iterates, climbs, and writes checkpoints."""

from __future__ import annotations

import json

import pytest

from splatforge.models import SceneSpec, TaskSpec
from splatforge.orchestrator import run_improvement_loop
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


def test_loop_writes_checkpoints_and_climbs(tmp_path) -> None:
    result = run_improvement_loop(
        _scene(), _task(), MujocoSimulationBackend(),
        iterations=4, n_rollouts=24, seed=0,
        run_id="t1", runs_dir=tmp_path,
        repository=JsonlRepository(root=tmp_path),
        use_critic=False,  # hermetic: no Gemini
    )

    # one checkpoint per iteration
    assert len(result.checkpoints) == 4

    # each iteration wrote a contract-shaped metrics.json
    for i in range(4):
        metrics_path = tmp_path / "t1" / f"iter_{i:02d}" / "metrics.json"
        assert metrics_path.exists()
        data = json.loads(metrics_path.read_text())
        assert data["iteration"] == i
        assert data["run_id"] == "t1"
        assert 0.0 <= data["success_rate"] <= 1.0
        assert data["n_rollouts"] == 24
        assert (tmp_path / "t1" / f"iter_{i:02d}" / "critic.txt").exists()

    # the curve is non-decreasing and actually improves (self-improvement is real)
    rates = [c.success_rate for c in result.checkpoints]
    assert rates == sorted(rates)
    assert result.final_success_rate > result.initial_success_rate

    # run-level curve.json summary exists
    assert (tmp_path / "t1" / "curve.json").exists()


def test_loop_requires_at_least_one_iteration(tmp_path) -> None:
    with pytest.raises(ValueError):
        run_improvement_loop(
            _scene(), _task(), MujocoSimulationBackend(),
            iterations=0, runs_dir=tmp_path,
            repository=JsonlRepository(root=tmp_path), use_critic=False,
        )
