from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from splatforge.storage.repository import Repository


class SuccessRatePoint(BaseModel):
    index: int
    success_rate: float
    episode_id: str | None = None
    label: str = ""


class SuccessRateSeries(BaseModel):
    points: list[SuccessRatePoint] = Field(default_factory=list)
    current_rate: float = 0.0
    source: str = "episodes"


def build_success_rate_series(repository: Repository) -> SuccessRateSeries:
    episodes = repository.find("episodes")
    if not episodes:
        return SuccessRateSeries(source="empty")

    points: list[SuccessRatePoint] = []
    successes = 0
    for index, episode in enumerate(episodes, start=1):
        if episode.get("status") == "success":
            successes += 1
        rate = round((successes / index) * 100, 1)
        points.append(
            SuccessRatePoint(
                index=index,
                success_rate=rate,
                episode_id=str(episode.get("episode_id", "")),
                label=f"episode {index}",
            )
        )
    return SuccessRateSeries(
        points=points,
        current_rate=points[-1].success_rate if points else 0.0,
        source="episodes",
    )


def merge_run_summary_point(
    series: SuccessRateSeries,
    summary: dict[str, Any],
) -> SuccessRateSeries:
    retest = summary.get("retest")
    if not retest:
        return series
    next_index = len(series.points) + 1
    retest_rate = 100.0 if retest.get("status") == "success" else series.current_rate
    point = SuccessRatePoint(
        index=next_index,
        success_rate=retest_rate,
        episode_id=str(retest.get("episode_id", "")),
        label="latest run",
    )
    return SuccessRateSeries(
        points=[*series.points, point],
        current_rate=retest_rate,
        source=series.source,
    )
