"""LoRA fine-tune harness (SPL-11 / A5).

Trains the GraspNet's LoRA adapter by behaviour cloning on the system's own
rollouts: each trajectory contributes a (noisy observation -> true mug position)
pair, and the adapter learns to localise the mug so the grasp lands. This is the
"distill" step done with a real fine-tune (vs the parameter-update placeholder in
A6). Runs on CPU for tests and on an A100 (Colab) for the real run.
"""

from __future__ import annotations

import random
from pathlib import Path
from typing import Any

import torch
from torch import nn

from splatforge.policy.neural import NeuralGraspPolicy, build_lora_policy


def build_training_pairs(
    trajectories: list[dict[str, Any]],
    noise_std: float = 0.04,
    seed: int = 0,
) -> tuple[list[list[float]], list[list[float]]]:
    """From replay-buffer trajectories, build (noisy_obs -> true mug xy) BC pairs.

    The label is the mug position the system actually encountered in its own
    rollouts; the observation is that position seen through sensor noise.
    """
    rng = random.Random(seed)
    observations: list[list[float]] = []
    labels: list[list[float]] = []
    for trajectory in trajectories:
        mug_xy = trajectory.get("scene", {}).get("mug_xy")
        if not mug_xy or len(mug_xy) != 2:
            continue
        mx, my = float(mug_xy[0]), float(mug_xy[1])
        observations.append([mx + rng.gauss(0, noise_std), my + rng.gauss(0, noise_std)])
        labels.append([mx, my])
    return observations, labels


def train_lora_policy(
    observations: list[list[float]],
    labels: list[list[float]],
    *,
    epochs: int = 400,
    lr: float = 1e-2,
    r: int = 8,
    device: str = "cpu",
    seed: int = 0,
) -> tuple[NeuralGraspPolicy, list[float]]:
    """Behaviour-clone the LoRA adapter; returns the policy and the loss history."""
    if not observations:
        raise ValueError("no training pairs")

    torch.manual_seed(seed)
    model = build_lora_policy(r=r).to(device)
    model.train()

    x = torch.tensor(observations, dtype=torch.float32, device=device)
    y = torch.tensor(labels, dtype=torch.float32, device=device)
    trainable = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.Adam(trainable, lr=lr)
    loss_fn = nn.MSELoss()

    history: list[float] = []
    for epoch in range(epochs):
        optimizer.zero_grad()
        loss = loss_fn(model(x), y)
        loss.backward()
        optimizer.step()
        if epoch % max(1, epochs // 10) == 0 or epoch == epochs - 1:
            history.append(float(loss.item()))

    model.eval()
    return NeuralGraspPolicy(model), history


def evaluate_success(
    policy: NeuralGraspPolicy,
    backend: Any,
    scene: Any,
    task: Any,
    *,
    n: int = 40,
    spread: float = 0.10,
    noise_std: float = 0.04,
    seed: int = 1,
    use_adapter: bool = True,
) -> float:
    """Success rate when the grasp target comes from the neural policy.

    `use_adapter=False` measures the base (nominal-aim) baseline for before/after.
    """
    from splatforge.policy import DEFAULT_POLICY

    rng = random.Random(seed)
    successes = 0
    for _ in range(n):
        mug_x = rng.uniform(-spread, spread)
        obs = (mug_x + rng.gauss(0, noise_std), 0.0 + rng.gauss(0, noise_std))
        target_x, target_y = policy.predict(obs, use_adapter=use_adapter)
        scene_i = scene.model_copy(update={"metadata": {**scene.metadata, "mug_xy": [mug_x, 0.0]}})
        attempt = DEFAULT_POLICY.model_copy(
            update={
                "parameters": {
                    **DEFAULT_POLICY.parameters,
                    "grasp_target_x_m": target_x,
                    "grasp_target_y_m": target_y,
                }
            }
        )
        episode = backend.run_episode(scene_i, task, attempt)
        successes += int(episode.observation.physics_metrics["success"])
    return successes / n


def save_adapter(policy: NeuralGraspPolicy, path: str | Path) -> Path:
    path = Path(path)
    policy.save(path)
    return path
