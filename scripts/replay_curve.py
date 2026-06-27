"""A7 (SPL-13): replay the banked real curve — what the demo shows on stage.

    python scripts/replay_curve.py                       # demo/cached_run/overnight
    python scripts/replay_curve.py demo/cached_run/overnight

Deterministic playback of the banked checkpoints: no MuJoCo, no Gemini, no GPU,
no API key. The success rates are the real ones measured when the run was banked.
"""

from __future__ import annotations

import argparse

from splatforge.orchestrator import load_cached_run

DEFAULT_RUN = "demo/cached_run/overnight"


def main() -> int:
    parser = argparse.ArgumentParser(description="Replay a banked real curve.")
    parser.add_argument("run_dir", nargs="?", default=DEFAULT_RUN)
    parser.add_argument("--show-critic", action="store_true", help="print the critic reasoning per iteration")
    args = parser.parse_args()

    cached = load_cached_run(args.run_dir)
    print(f"run_id={cached.run_id}  iterations={cached.iterations}  (replayed, no recompute)")
    print("\niter  success_rate  curve")
    for point in cached.points:
        bar = "#" * round(point.success_rate * 30)
        print(f" {point.iteration:>2}   {point.success_rate:>6.1%}    {bar}")
        if args.show_critic and point.critic:
            first_line = point.critic.strip().splitlines()[0] if point.critic.strip() else ""
            print(f"        critic: {first_line}")
    print(f"\nclimb: {cached.initial_success_rate:.1%} -> {cached.final_success_rate:.1%}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
