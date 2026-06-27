"""A4 (SPL-10): run rollouts, persist trajectories, read them back.

    python scripts/replay_demo.py -n 30

Writes trajectories to the replay buffer (local runs/trajectories.jsonl unless
MONGODB_URI is set), then reloads them to prove the round-trip and recomputes the
success rate from what was stored.
"""

from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

from splatforge.orchestrator import ReplayBuffer, evaluate_policy, load_local_trajectories
from splatforge.policy import DEFAULT_POLICY
from splatforge.scanning.scenes import load_scene
from splatforge.sim.task import build_pick_task
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend
from splatforge.storage import JsonlRepository


def main() -> int:
    parser = argparse.ArgumentParser(description="Persist and reload rollout trajectories.")
    parser.add_argument("--scene", default="mug_table")
    parser.add_argument("--task", default="pick_up_mug")
    parser.add_argument("-n", "--n-rollouts", type=int, default=30)
    parser.add_argument("--run-id", default="demo_run")
    args = parser.parse_args()

    backend = MujocoSimulationBackend()
    if not backend.is_available():
        print(f"[mujoco] {backend.status_message()}")
        return 2

    scene = load_scene(args.scene)
    task = build_pick_task(args.task)

    # Use an isolated dir so the demo is clean and repeatable.
    out_dir = Path(tempfile.mkdtemp(prefix="splatforge_replay_"))
    buffer = ReplayBuffer(JsonlRepository(root=out_dir))

    report = evaluate_policy(
        scene, task, DEFAULT_POLICY, backend,
        n_rollouts=args.n_rollouts, seed=0,
        replay=buffer, run_id=args.run_id, iteration=0,
    )

    reloaded = load_local_trajectories(root=out_dir)
    reloaded_successes = sum(1 for t in reloaded if t["success"])

    print(f"store: {out_dir}/trajectories.jsonl")
    print(f"written={buffer.written}  reloaded={len(reloaded)}")
    print(f"report success_rate={report.success_rate:.2%} ({report.successes}/{report.n_rollouts})")
    print(f"reloaded success_rate={reloaded_successes / len(reloaded):.2%} ({reloaded_successes}/{len(reloaded)})")
    sample = reloaded[0]
    print(f"sample trajectory keys: {sorted(sample.keys())}")
    print(f"  run_id={sample['run_id']} success={sample['success']} actions={len(sample['actions'])} scene.mug_xy={sample['scene'].get('mug_xy')}")
    ok = buffer.written == len(reloaded) == args.n_rollouts and reloaded_successes == report.successes
    print(f"round-trip ok: {str(ok).lower()}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
