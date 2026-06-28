"""Cached-run loader for deterministic demo replay (SPL-13 / A7).

A7 decouples "the improvement is real" from "the demo happens live". The
improvement loop (A6) runs offline and writes per-iteration checkpoints; this
module reads those checkpoints back so the dashboard/demo can replay the real
climbing curve on stage with no GPU, no Gemini, and no recomputation — every
playback is byte-identical to the run we banked.
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field


class CachedIteration(BaseModel):
    iteration: int
    success_rate: float
    n_rollouts: int
    adapter_path: str = ""
    curriculum_ids: list[str] = Field(default_factory=list)
    timestamp: str = ""
    critic: str = ""


class CachedRun(BaseModel):
    run_id: str
    iterations: int
    points: list[CachedIteration] = Field(default_factory=list)
    initial_success_rate: float = 0.0
    final_success_rate: float = 0.0


def load_cached_run(run_dir: str | Path) -> CachedRun:
    """Read a banked run directory (the `iter_NN/` artifacts) into a replay object."""
    run_dir = Path(run_dir)
    if not run_dir.exists():
        raise FileNotFoundError(f"No cached run at {run_dir}")

    points: list[CachedIteration] = []
    for iter_dir in sorted(run_dir.glob("iter_*")):
        metrics_path = iter_dir / "metrics.json"
        if not metrics_path.exists():
            continue
        metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
        critic_path = iter_dir / "critic.txt"
        points.append(
            CachedIteration(
                iteration=int(metrics["iteration"]),
                success_rate=float(metrics["success_rate"]),
                n_rollouts=int(metrics["n_rollouts"]),
                adapter_path=str(metrics.get("adapter_path", "")),
                curriculum_ids=list(metrics.get("curriculum_ids", [])),
                timestamp=str(metrics.get("timestamp", "")),
                critic=critic_path.read_text(encoding="utf-8") if critic_path.exists() else "",
            )
        )

    points.sort(key=lambda point: point.iteration)
    if not points:
        raise ValueError(f"Cached run at {run_dir} has no iteration metrics")

    return CachedRun(
        run_id=run_dir.name,
        iterations=len(points),
        points=points,
        initial_success_rate=points[0].success_rate,
        final_success_rate=points[-1].success_rate,
    )


def cached_run_series(run_dir: str | Path):
    """Convert a banked run into the dashboard's SuccessRateSeries (B5 wiring).

    success_rate fractions (0-1) become percentages (0-100) so the chart, which
    already expects percent, animates the real banked curve.
    """
    from splatforge.storage.metrics import SuccessRatePoint, SuccessRateSeries

    cached = load_cached_run(run_dir)
    points = [
        SuccessRatePoint(
            index=point.iteration + 1,
            success_rate=round(point.success_rate * 100, 1),
            label=f"iter {point.iteration}",
        )
        for point in cached.points
    ]
    return SuccessRateSeries(
        points=points,
        current_rate=points[-1].success_rate if points else 0.0,
        source=f"cached:{cached.run_id}",
    )
