from __future__ import annotations

import argparse
import json
from pathlib import Path

from dotenv import load_dotenv

from splatforge.api.schemas import summarize_run
from splatforge.orchestrator import run_practice_loop


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(prog="splatforge")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run one SplatForge practice loop.")
    _add_run_args(run_parser)

    sim_parser = subparsers.add_parser("sim", help="Simulation commands.")
    sim_subparsers = sim_parser.add_subparsers(dest="sim_command", required=True)
    sim_run_parser = sim_subparsers.add_parser("run", help="Run a simulation episode.")
    _add_run_args(sim_run_parser)

    report_parser = subparsers.add_parser("report", help="Print local JSONL run artifacts.")
    report_parser.add_argument("--collection", default="episodes")
    report_parser.add_argument("--runs-dir", default="runs")

    args = parser.parse_args()

    if args.command == "run":
        result = run_practice_loop(
            scene_name=args.scene,
            task_name=args.task,
            backend_name=args.backend,
            max_variants=args.max_variants,
        )
        print(result.model_dump_json(indent=2))
        return

    if args.command == "sim" and args.sim_command == "run":
        result = run_practice_loop(
            scene_name=args.scene,
            task_name=args.task,
            backend_name=args.backend,
            max_variants=args.max_variants,
        )
        _print_run_summary(summarize_run(result))
        return

    if args.command == "report":
        _print_collection(Path(args.runs_dir), args.collection)


def _add_run_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--scene", default="mug_table")
    parser.add_argument("--task", default="pick_mug")
    parser.add_argument("--backend", default="dry-run")
    parser.add_argument("--robot", dest="backend", help=argparse.SUPPRESS)
    parser.add_argument("--max-variants", type=int, default=3)


def _print_run_summary(summary: object) -> None:
    from splatforge.api.schemas import RunSummary

    if not isinstance(summary, RunSummary):
        raise TypeError("summary must be a RunSummary")

    print("SplatForge Simulation Run")
    print("")
    print(f"Scene: {summary.scene}")
    print(f"Task: {summary.task}")
    print(f"Backend: {summary.backend}")
    print(f"Timeline: {' -> '.join(summary.timeline)}")
    print("")
    print(f"Attempt 1: {summary.initial_attempt.status.value.upper()}")
    print(f"Cause: {summary.failure_cause or summary.initial_attempt.summary}")
    print(f"Variants generated: {len(summary.variants)}")
    if summary.policy_changes:
        changes = [
            f"{change.parameter} {change.before:g} -> {change.after:g}"
            for change in summary.policy_changes
        ]
        print(f"Policy update: {', '.join(changes)}")
    if summary.retest:
        print(f"Retest: {summary.retest.status.value.upper()}")
    print("")
    print("Raw logs: runs/*.jsonl or MongoDB when MONGODB_URI is configured")


def _print_collection(root: Path, collection: str) -> None:
    path = root / f"{collection}.jsonl"
    if not path.exists():
        raise FileNotFoundError(f"No local collection found at {path}")
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            print(json.dumps(json.loads(line), indent=2))


if __name__ == "__main__":
    main()
