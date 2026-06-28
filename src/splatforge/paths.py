from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNS_ROOT = REPO_ROOT / "runs"
RERUN_ROOT = RUNS_ROOT / "rerun"


def ensure_run_dirs() -> None:
    RUNS_ROOT.mkdir(parents=True, exist_ok=True)
    RERUN_ROOT.mkdir(parents=True, exist_ok=True)


def rerun_recording_path(run_id: str) -> Path:
    ensure_run_dirs()
    return RERUN_ROOT / f"{run_id}.rrd"


def rerun_metadata_path(run_id: str) -> Path:
    ensure_run_dirs()
    return RERUN_ROOT / f"{run_id}.json"
