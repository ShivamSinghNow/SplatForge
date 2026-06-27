"""A7 (SPL-13): banked runs load deterministically and the committed cache is real."""

from __future__ import annotations

from pathlib import Path

import pytest

from splatforge.models import SceneSpec, TaskSpec
from splatforge.orchestrator import load_cached_run, run_improvement_loop
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend
from splatforge.storage import JsonlRepository

REPO_ROOT = Path(__file__).resolve().parents[1]
COMMITTED_CACHE = REPO_ROOT / "demo" / "cached_run" / "overnight"


def test_round_trip_load_matches_run(tmp_path) -> None:
    if not MujocoSimulationBackend().is_available():
        pytest.skip("mujoco not installed")

    result = run_improvement_loop(
        SceneSpec(scene_id="s", name="t", splat_asset="demo/assets/x.splat"),
        TaskSpec(name="pick_up_mug", object_name="mug", goal="lift the mug"),
        MujocoSimulationBackend(),
        iterations=3, n_rollouts=20, seed=0,
        run_id="t", runs_dir=tmp_path,
        repository=JsonlRepository(root=tmp_path), use_critic=False,
    )

    cached = load_cached_run(tmp_path / "t")
    assert cached.iterations == 3
    assert [p.success_rate for p in cached.points] == [c.success_rate for c in result.checkpoints]
    assert cached.final_success_rate == result.final_success_rate


def test_committed_overnight_cache_is_a_real_climb() -> None:
    # The demo's source of truth must exist and actually climb (no MuJoCo/Gemini needed).
    cached = load_cached_run(COMMITTED_CACHE)
    assert cached.iterations >= 5
    rates = [p.success_rate for p in cached.points]
    assert rates == sorted(rates)
    assert cached.final_success_rate > cached.initial_success_rate
    assert cached.final_success_rate >= 0.85  # believable, strong endpoint
    # critic reasoning was banked alongside each checkpoint
    assert any(point.critic.strip() for point in cached.points)
