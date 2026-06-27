"""A3 (SPL-9): run N rollouts for a policy and print its success rate.

    python scripts/eval_policy.py                 # default policy, N=30
    python scripts/eval_policy.py -n 50 --sweep   # show the rate climbing as
                                                  # the policy's gripper widens

The --sweep flag previews the self-improvement curve: wider/better policies
solve more of the sampled mug displacements, so the rate rises monotonically.
"""

from __future__ import annotations

import argparse

from splatforge.orchestrator import evaluate_policy
from splatforge.policy import DEFAULT_POLICY
from splatforge.scanning.scenes import load_scene
from splatforge.sim.task import build_pick_task
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate a policy over N rollouts.")
    parser.add_argument("--scene", default="mug_table")
    parser.add_argument("--task", default="pick_up_mug")
    parser.add_argument("-n", "--n-rollouts", type=int, default=30)
    parser.add_argument("--spread", type=float, default=0.10, help="mug displacement range (m)")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument(
        "--sweep",
        action="store_true",
        help="sweep gripper width to preview the success curve",
    )
    args = parser.parse_args()

    backend = MujocoSimulationBackend()
    if not backend.is_available():
        print(f"[mujoco] {backend.status_message()}")
        return 2

    scene = load_scene(args.scene)
    task = build_pick_task(args.task)

    widths = [0.06, 0.10, 0.16, 0.22] if args.sweep else [DEFAULT_POLICY.parameters["gripper_width_m"]]

    print(f"scene={scene.scene_id} task={task.name} N={args.n_rollouts} spread={args.spread} seed={args.seed}")
    print("gripper_width_m  success_rate  (successes/N)")
    for width in widths:
        policy = DEFAULT_POLICY.model_copy(
            update={
                "policy_version": f"policy_gw_{width}",
                "parameters": {**DEFAULT_POLICY.parameters, "gripper_width_m": width},
            }
        )
        report = evaluate_policy(
            scene, task, policy, backend,
            n_rollouts=args.n_rollouts, spread_m=args.spread, seed=args.seed,
        )
        bar = "#" * round(report.success_rate * 30)
        print(f"   {width:<11.2f}  {report.success_rate:>6.2%}    ({report.successes}/{report.n_rollouts})  {bar}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
