"""Self-improvement loop driven by real LoRA fine-tuning (A5 -> A6 wiring).

Same shape as `run_improvement_loop`, but the "distill" step is a genuine PEFT/LoRA
fine-tune (A5) instead of the scalar parameter update. Each iteration the system
practises more scenes (self-generated rollouts), retrains the LoRA adapter on all
accumulated experience, and is measured on a FIXED held-out eval set so the curve
reflects real policy skill — not eval-set luck. The neural policy localises the mug
from a noisy observation, so the grasp lands.

Requires the `train` extra (torch, peft); not imported by `orchestrator.__init__`,
so the core package stays torch-free.
"""

from __future__ import annotations

import random

from splatforge.models import PolicyVersion, SceneSpec, TaskSpec, new_id, utc_now
from splatforge.orchestrator.improvement import (
    IterationCheckpoint,
    ImprovementResult,
    _write_curve,
    _write_iteration_artifacts,
)
from splatforge.policy.lora_trainer import build_training_pairs, evaluate_success, train_lora_policy
from splatforge.policy.neural import NeuralGraspPolicy
from splatforge.simulation.base import SimulationBackend


def _collect_self_rollouts(n: int, seed: int, spread: float = 0.10) -> list[dict]:
    """The scenes the system practises this round (its own generated experience)."""
    rng = random.Random(seed)
    return [{"scene": {"mug_xy": [rng.uniform(-spread, spread), 0.0]}} for _ in range(n)]


def run_lora_improvement_loop(
    scene: SceneSpec,
    task: TaskSpec,
    backend: SimulationBackend,
    *,
    iterations: int = 5,
    rollouts_per_iter: int = 40,
    epochs: int = 120,
    lr: float = 1e-2,
    eval_n: int = 150,
    eval_seed: int = 999,
    noise_std: float = 0.02,
    run_id: str | None = None,
    runs_dir: str = "runs",
    device: str = "cpu",
) -> ImprovementResult:
    if iterations < 1:
        raise ValueError("iterations must be >= 1")

    from pathlib import Path

    run_id = run_id or new_id("lora")
    base_dir = Path(runs_dir) / run_id
    checkpoints: list[IterationCheckpoint] = []
    accumulated: list[dict] = []
    policy = NeuralGraspPolicy.new_lora()
    trainable = total = 0

    for i in range(iterations):
        if i == 0:
            # untrained base = nominal aim baseline
            rate = evaluate_success(policy, backend, scene, task, n=eval_n, use_adapter=False, seed=eval_seed)
            note = "base policy (LoRA adapter untrained) — nominal aim"
        else:
            accumulated += _collect_self_rollouts(rollouts_per_iter, seed=i)
            obs, labels = build_training_pairs(accumulated, noise_std=noise_std, seed=1)
            policy, _ = train_lora_policy(obs, labels, epochs=epochs, lr=lr, device=device, seed=0)
            rate = evaluate_success(policy, backend, scene, task, n=eval_n, use_adapter=True, seed=eval_seed)
            trainable = sum(p.numel() for p in policy.model.parameters() if p.requires_grad)
            total = sum(p.numel() for p in policy.model.parameters())
            note = (
                f"LoRA fine-tune on {len(accumulated)} self-generated rollouts; "
                f"trainable params {trainable}/{total}"
            )

        adapter_dir = base_dir / f"iter_{i:02d}" / "adapter"
        policy.save(adapter_dir)

        checkpoint = IterationCheckpoint(
            iteration=i,
            run_id=run_id,
            success_rate=round(rate, 4),
            n_rollouts=eval_n,
            adapter_path=str(adapter_dir),
            curriculum_ids=[],
            policy_version=PolicyVersion(policy_version=f"lora_v{i}").policy_version,
            timestamp=utc_now().isoformat(),
            artifact_dir=str(base_dir / f"iter_{i:02d}"),
        )
        _write_iteration_artifacts(base_dir / f"iter_{i:02d}", checkpoint, note)
        checkpoints.append(checkpoint)

    _write_curve(base_dir, checkpoints)

    return ImprovementResult(
        run_id=run_id,
        iterations=iterations,
        checkpoints=checkpoints,
        final_policy_version=checkpoints[-1].policy_version,
        initial_success_rate=checkpoints[0].success_rate,
        final_success_rate=checkpoints[-1].success_rate,
    )
