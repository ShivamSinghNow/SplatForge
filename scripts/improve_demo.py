"""A6 (SPL-12): run the full self-improvement loop and show the climbing curve.

    python scripts/improve_demo.py            # 5 iterations
    python scripts/improve_demo.py -i 7 -n 40

Reads .env for GEMINI_API_KEY (curriculum + critic run on Gemini if present).
Writes runs/<run_id>/iter_NN/{metrics.json, critic.txt} and runs/<run_id>/curve.json.
"""

from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

from dotenv import load_dotenv

from splatforge.orchestrator import run_improvement_loop
from splatforge.scanning.scenes import load_scene
from splatforge.sim.task import build_pick_task
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend
from splatforge.storage import JsonlRepository


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the self-improvement loop.")
    parser.add_argument("-i", "--iterations", type=int, default=5)
    parser.add_argument("-n", "--n-rollouts", type=int, default=30)
    parser.add_argument("--run-id", default="demo")
    args = parser.parse_args()

    load_dotenv()

    backend = MujocoSimulationBackend()
    if not backend.is_available():
        print(f"[mujoco] {backend.status_message()}")
        return 2

    scene = load_scene("mug_table")
    task = build_pick_task("pick_up_mug")
    out_dir = Path(tempfile.mkdtemp(prefix="splatforge_run_"))

    result = run_improvement_loop(
        scene, task, backend,
        iterations=args.iterations, n_rollouts=args.n_rollouts,
        run_id=args.run_id, runs_dir=out_dir,
        repository=JsonlRepository(root=out_dir),
    )

    print(f"run_id={result.run_id}  iterations={result.iterations}")
    print(f"artifacts: {out_dir}/{result.run_id}/iter_NN/metrics.json")
    print("\niter  success_rate  policy        curve")
    for cp in result.checkpoints:
        bar = "#" * round(cp.success_rate * 30)
        print(f" {cp.iteration:>2}   {cp.success_rate:>6.1%}     {cp.policy_version:<11} {bar}")
    print(f"\nclimb: {result.initial_success_rate:.1%} -> {result.final_success_rate:.1%}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
