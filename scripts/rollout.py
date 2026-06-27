"""A1 (SPL-7): run one MuJoCo rollout and print a real success/failure.

This is the existential spike — it proves the success curve's y-axis exists.

    python scripts/rollout.py                 # centered grasp -> success: true
    python scripts/rollout.py --offset 0.08   # misses the mug   -> success: false
    python scripts/rollout.py --force-failure  # forced miss

Success is ground-truth physics: did the mug lift >= the contract threshold.
"""

from __future__ import annotations

import argparse

from splatforge.models import AttemptStatus, PolicyVersion
from splatforge.scanning.scenes import load_scene
from splatforge.sim.task import build_pick_task
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one MuJoCo pick rollout.")
    parser.add_argument("--scene", default="mug_table")
    parser.add_argument("--task", default="pick_up_mug")
    parser.add_argument(
        "--offset",
        type=float,
        default=0.0,
        help="pregrasp x-offset in meters; beyond the grasp radius the grasp misses",
    )
    parser.add_argument("--force-failure", action="store_true", help="force a guaranteed miss")
    args = parser.parse_args()

    scene = load_scene(args.scene)
    task = build_pick_task(args.task)
    policy = PolicyVersion(
        policy_version="v0_scripted",
        parameters={
            "pregrasp_offset_x_m": args.offset,
            "approach_height_m": 0.30,
            "gripper_width_m": 0.06,
        },
    )

    backend = MujocoSimulationBackend()
    if not backend.is_available():
        print(f"[mujoco] {backend.status_message()}")
        return 2

    episode = backend.run_episode(scene, task, policy, forced_failure=args.force_failure)
    m = episode.observation.physics_metrics

    print(f"scene={scene.scene_id}  task={task.name}  backend={backend.name}")
    print(f"grasped={m['grasped']}  grasp_distance_m={m['grasp_distance_m']:.3f}")
    print(f"mug_lift_m={m['mug_lift_m']:.3f}  threshold_m={m['lift_threshold_m']:.3f}")
    print(f"success: {str(episode.status == AttemptStatus.SUCCESS).lower()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
