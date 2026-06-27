"""Bank the real-LoRA self-improvement curve (A5 -> A6 wiring).

    python scripts/produce_lora_curve.py            # demo/cached_run/lora_overnight/

Runs the loop whose distill step is a genuine LoRA fine-tune, and writes the
per-iteration checkpoints so the demo can replay a curve produced by real weight
updates. Runs on CPU or A100 (device auto-detected).
"""

from __future__ import annotations

import argparse

from splatforge.orchestrator import load_cached_run
from splatforge.orchestrator.lora_loop import run_lora_improvement_loop
from splatforge.scanning.scenes import load_scene
from splatforge.sim.task import build_pick_task
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend

CACHE_ROOT = "demo/cached_run"


def main() -> int:
    parser = argparse.ArgumentParser(description="Bank the real-LoRA curve.")
    parser.add_argument("-i", "--iterations", type=int, default=5)
    parser.add_argument("--rollouts", type=int, default=40)
    parser.add_argument("--run-id", default="lora_overnight")
    args = parser.parse_args()

    backend = MujocoSimulationBackend()
    if not backend.is_available():
        print(f"[mujoco] {backend.status_message()}")
        return 2

    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    scene = load_scene("mug_table")
    task = build_pick_task("pick_up_mug")

    result = run_lora_improvement_loop(
        scene, task, backend,
        iterations=args.iterations, rollouts_per_iter=args.rollouts,
        run_id=args.run_id, runs_dir=CACHE_ROOT, device=device,
    )

    cached = load_cached_run(f"{CACHE_ROOT}/{args.run_id}")
    print(f"device={device}  banked {cached.iterations} iters -> {CACHE_ROOT}/{args.run_id}/")
    print(f"curve: {[round(p.success_rate, 3) for p in cached.points]}")
    print(f"climb: {result.initial_success_rate:.1%} -> {result.final_success_rate:.1%}  (real LoRA weight updates)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
