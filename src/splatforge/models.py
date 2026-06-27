from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def utc_now() -> datetime:
    return datetime.now(UTC)


class AttemptStatus(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"


class CriticName(str, Enum):
    PHYSICS = "physics"
    GEMINI = "gemini"
    VLM = "vlm"
    MINIMAX = "minimax"
    GEMMA = "gemma"
    MONJU = "monju"


class TaskSpec(BaseModel):
    name: str
    object_name: str
    goal: str
    success_radius_m: float = 0.05
    stable_grasp_steps: int = 10
    # Contract (CONTRACTS.md §1): success = object lifted >= this height off the table.
    lift_threshold_m: float = 0.10


class SceneSpec(BaseModel):
    scene_id: str
    name: str
    splat_asset: Path
    physics_proxy: Path | None = None
    robot_frame: str = "table"
    metadata: dict[str, Any] = Field(default_factory=dict)


class Observation(BaseModel):
    observation_id: str = Field(default_factory=lambda: new_id("obs"))
    rgb_path: Path | None = None
    depth_path: Path | None = None
    robot_state: dict[str, Any] = Field(default_factory=dict)
    scene_state: dict[str, Any] = Field(default_factory=dict)
    physics_metrics: dict[str, float | int | bool | str] = Field(default_factory=dict)
    captured_at: datetime = Field(default_factory=utc_now)


class RobotAction(BaseModel):
    action_id: str = Field(default_factory=lambda: new_id("act"))
    command: str
    parameters: dict[str, float | int | bool | str] = Field(default_factory=dict)


class Episode(BaseModel):
    episode_id: str = Field(default_factory=lambda: new_id("episode"))
    scene_id: str
    task: TaskSpec
    robot_adapter: str
    policy_version: str
    status: AttemptStatus
    observation: Observation
    action: RobotAction
    variant_of: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Critique(BaseModel):
    critique_id: str = Field(default_factory=lambda: new_id("critique"))
    episode_id: str
    critic: CriticName
    root_cause: str
    evidence: list[str] = Field(default_factory=list)
    suggested_variants: list[str] = Field(default_factory=list)
    policy_hints: dict[str, float | int | bool | str] = Field(default_factory=dict)
    confidence: float = 0.5
    raw: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class FailureReport(BaseModel):
    report_id: str = Field(default_factory=lambda: new_id("report"))
    episode_id: str
    root_cause: str
    evidence: list[str]
    suggested_variants: list[str]
    policy_hints: dict[str, float | int | bool | str]
    critic_outputs: list[Critique]
    confidence: float
    created_at: datetime = Field(default_factory=utc_now)


class PracticeVariant(BaseModel):
    variant_id: str = Field(default_factory=lambda: new_id("variant"))
    scene_id: str
    source_episode_id: str
    label: str
    transform: dict[str, float | int | bool | str]
    reason: str
    created_at: datetime = Field(default_factory=utc_now)


class PolicyVersion(BaseModel):
    policy_version: str
    source_policy_version: str | None = None
    parameters: dict[str, float] = Field(default_factory=dict)
    training_episode_ids: list[str] = Field(default_factory=list)
    notes: str = ""
    created_at: datetime = Field(default_factory=utc_now)
