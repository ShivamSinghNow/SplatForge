"""A5 (SPL-11): the LoRA fine-tune harness builds data, trains, and improves."""

from __future__ import annotations

import importlib.util

import pytest

from splatforge.policy.lora_trainer import build_training_pairs

_HAS_TORCH = importlib.util.find_spec("torch") is not None and importlib.util.find_spec("peft") is not None
_HAS_MUJOCO = importlib.util.find_spec("mujoco") is not None


def test_build_training_pairs_uses_mug_positions() -> None:
    trajectories = [
        {"scene": {"mug_xy": [0.05, 0.0]}, "success": True},
        {"scene": {"mug_xy": [-0.08, 0.0]}, "success": False},
        {"scene": {}, "success": True},  # skipped (no mug_xy)
    ]
    obs, labels = build_training_pairs(trajectories, noise_std=0.0, seed=0)
    assert labels == [[0.05, 0.0], [-0.08, 0.0]]
    # zero noise -> observation equals the true label
    assert obs == labels


@pytest.mark.skipif(not _HAS_TORCH, reason="torch/peft not installed")
def test_lora_training_reduces_loss_and_adapter_round_trips(tmp_path) -> None:
    import random

    from splatforge.policy.lora_trainer import train_lora_policy
    from splatforge.policy.neural import NeuralGraspPolicy

    rng = random.Random(0)
    trajectories = [{"scene": {"mug_xy": [rng.uniform(-0.1, 0.1), 0.0]}} for _ in range(200)]
    obs, labels = build_training_pairs(trajectories, noise_std=0.02, seed=1)

    policy, history = train_lora_policy(obs, labels, epochs=200, lr=1e-2, device="cpu")
    assert history[-1] < history[0]  # the adapter learned

    policy.save(tmp_path / "adapter")
    reloaded = NeuralGraspPolicy.load(tmp_path / "adapter")
    # adapter-on prediction tracks the mug; adapter-off is the nominal (0,0) baseline
    on = reloaded.predict((0.08, 0.0), use_adapter=True)
    off = reloaded.predict((0.08, 0.0), use_adapter=False)
    assert abs(on[0] - 0.08) < abs(off[0] - 0.08)
    assert abs(off[0]) < 1e-3 and abs(off[1]) < 1e-3


@pytest.mark.skipif(not (_HAS_TORCH and _HAS_MUJOCO), reason="torch/peft/mujoco not installed")
def test_lora_policy_beats_baseline_success() -> None:
    import random

    from splatforge.models import SceneSpec, TaskSpec
    from splatforge.policy.lora_trainer import evaluate_success, train_lora_policy
    from splatforge.simulation.mujoco_sim import MujocoSimulationBackend

    rng = random.Random(2)
    trajectories = [{"scene": {"mug_xy": [rng.uniform(-0.1, 0.1), 0.0]}} for _ in range(300)]
    obs, labels = build_training_pairs(trajectories, noise_std=0.02, seed=3)
    policy, _ = train_lora_policy(obs, labels, epochs=300, lr=1e-2, device="cpu")

    backend = MujocoSimulationBackend()
    scene = SceneSpec(scene_id="s", name="t", splat_asset="demo/assets/x.splat")
    task = TaskSpec(name="pick_up_mug", object_name="mug", goal="lift the mug")

    base_rate = evaluate_success(policy, backend, scene, task, n=40, use_adapter=False, seed=4)
    lora_rate = evaluate_success(policy, backend, scene, task, n=40, use_adapter=True, seed=4)
    assert lora_rate > base_rate
