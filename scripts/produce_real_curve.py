"""A7 (SPL-13): produce the canonical "overnight" real curve, banked for replay.

    python scripts/produce_real_curve.py            # writes demo/cached_run/overnight/
    python scripts/produce_real_curve.py -i 6 --run-id overnight

Runs the real self-improvement loop (A6) deterministically and writes the small
checkpoint artifacts (iter_NN/metrics.json + critic.txt, curve.json) into a
COMMITTED location so the demo replays this exact run on stage. The bulky
trajectory/episode rows go to a throwaway temp store, not the committed cache.
Reads .env for GEMINI_API_KEY (curriculum + critic reasoning run on Gemini).
"""

from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

from dotenv import load_dotenv

from splatforge.orchestrator import load_cached_run, run_improvement_loop
from splatforge.scanning.scenes import load_scene
from splatforge.sim.task import build_pick_task
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend
from splatforge.storage import JsonlRepository

CACHE_ROOT = Path("demo/cached_run")


def main() -> int:
    parser = argparse.ArgumentParser(description="Bank the canonical real curve.")
    parser.add_argument("-i", "--iterations", type=int, default=6)
    parser.add_argument("-n", "--n-rollouts", type=int, default=30)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--run-id", default="overnight")
    args = parser.parse_args()

    load_dotenv()

    backend = MujocoSimulationBackend()
    if not backend.is_available():
        print(f"[mujoco] {backend.status_message()}")
        return 2

    scene = load_scene("mug_table")
    task = build_pick_task("pick_up_mug")

    # Committed cache holds the small artifacts; bulky rows go to a temp repo.
    scratch_repo = JsonlRepository(root=Path(tempfile.mkdtemp(prefix="splatforge_scratch_")))

    result = run_improvement_loop(
        scene, task, backend,
        iterations=args.iterations, n_rollouts=args.n_rollouts, seed=args.seed,
        run_id=args.run_id, runs_dir=CACHE_ROOT, repository=scratch_repo,
    )

    cached = load_cached_run(CACHE_ROOT / args.run_id)
    print(f"banked {cached.iterations} iterations -> {CACHE_ROOT / args.run_id}/")
    print(f"curve: {[round(p.success_rate, 3) for p in cached.points]}")
    print(f"climb: {result.initial_success_rate:.1%} -> {result.final_success_rate:.1%}")
    print("commit demo/cached_run/ so the demo replays this exact run.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
