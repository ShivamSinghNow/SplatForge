"""Replay buffer (SPL-10 / A4): persist rollout trajectories.

Each rollout becomes a trajectory record (CONTRACTS.md §4) written to the store.
Storage is pluggable via the existing `Repository`: with no `MONGODB_URI` it lands
in `runs/trajectories.jsonl` (the local stub used until B4 stands up Atlas + Voyage);
with Atlas configured the same writes go to MongoDB. `critic` and `embedding` are
left open for B3 (critic) and B4 (Voyage failure vectors) to fill.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from splatforge.models import AttemptStatus, Episode, SceneSpec
from splatforge.storage import Repository, build_repository

TRAJECTORIES_COLLECTION = "trajectories"


class TrajectoryRecord(BaseModel):
    """One persisted rollout. Shape mirrors CONTRACTS.md §4."""

    run_id: str
    iteration: int
    policy_version: str
    curriculum_id: str | None = None
    scene: dict[str, Any] = Field(default_factory=dict)
    actions: list[dict[str, Any]] = Field(default_factory=list)
    success: bool = False
    mug_lift_m: float = 0.0
    # Filled in later by their owners; kept open so A4 doesn't block on them.
    critic: dict[str, Any] | None = None  # B3
    embedding: list[float] | None = None  # B4 (Voyage)


def episode_to_trajectory(
    episode: Episode,
    run_id: str,
    iteration: int,
    scene: SceneSpec | None = None,
    curriculum_id: str | None = None,
) -> TrajectoryRecord:
    obs = episode.observation
    scene_info: dict[str, Any] = {"scene_id": episode.scene_id, **obs.scene_state}
    if scene is not None and "mug_xy" in scene.metadata:
        scene_info["mug_xy"] = scene.metadata["mug_xy"]
    return TrajectoryRecord(
        run_id=run_id,
        iteration=iteration,
        policy_version=episode.policy_version,
        curriculum_id=curriculum_id,
        scene=scene_info,
        actions=[episode.action.model_dump(mode="json")],
        success=episode.status == AttemptStatus.SUCCESS,
        mug_lift_m=float(obs.physics_metrics.get("mug_lift_m", 0.0)),
    )


class ReplayBuffer:
    """Thin writer over a `Repository` (Atlas or local JSONL)."""

    def __init__(self, repository: Repository | None = None, collection: str = TRAJECTORIES_COLLECTION) -> None:
        self.repository = repository or build_repository()
        self.collection = collection
        self.written = 0

    def add(self, trajectory: TrajectoryRecord) -> None:
        self.repository.save(self.collection, trajectory)
        self.written += 1

    def add_episode(
        self,
        episode: Episode,
        run_id: str,
        iteration: int,
        scene: SceneSpec | None = None,
        curriculum_id: str | None = None,
    ) -> TrajectoryRecord:
        trajectory = episode_to_trajectory(episode, run_id, iteration, scene, curriculum_id)
        self.add(trajectory)
        return trajectory


def load_local_trajectories(
    root: Path | str = "runs",
    collection: str = TRAJECTORIES_COLLECTION,
) -> list[dict[str, Any]]:
    """Read back trajectories from the local JSONL stub (round-trip / verification).

    Atlas-side querying (incl. Voyage vector search over failures) is B4's job.
    """
    path = Path(root) / f"{collection}.jsonl"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]
