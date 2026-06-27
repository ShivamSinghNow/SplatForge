"""A5->A6 wiring: the LoRA-driven loop writes checkpoints and improves."""

from __future__ import annotations

import importlib.util
import json

import pytest

_HAS = (
    importlib.util.find_spec("torch") is not None
    and importlib.util.find_spec("peft") is not None
    and importlib.util.find_spec("mujoco") is not None
)
pytestmark = pytest.mark.skipif(not _HAS, reason="torch/peft/mujoco not installed")


def test_lora_loop_writes_checkpoints_and_improves(tmp_path) -> None:
    from splatforge.models import SceneSpec, TaskSpec
    from splatforge.orchestrator import load_cached_run
    from splatforge.orchestrator.lora_loop import run_lora_improvement_loop
    from splatforge.simulation.mujoco_sim import MujocoSimulationBackend

    scene = SceneSpec(scene_id="s", name="t", splat_asset="demo/assets/x.splat")
    task = TaskSpec(name="pick_up_mug", object_name="mug", goal="lift the mug")

    result = run_lora_improvement_loop(
        scene, task, MujocoSimulationBackend(),
        iterations=3, rollouts_per_iter=40, epochs=120,
        eval_n=120, run_id="lora_t", runs_dir=str(tmp_path),
    )

    assert result.iterations == 3
    for i in range(3):
        metrics = json.loads((tmp_path / "lora_t" / f"iter_{i:02d}" / "metrics.json").read_text())
        assert metrics["iteration"] == i
        assert 0.0 <= metrics["success_rate"] <= 1.0

    # real weight updates lift success well above the untrained base
    assert result.final_success_rate > result.initial_success_rate + 0.2

    cached = load_cached_run(tmp_path / "lora_t")
    assert cached.iterations == 3
