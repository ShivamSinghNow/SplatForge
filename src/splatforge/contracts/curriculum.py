from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from splatforge.models import new_id

DifficultyTag = Literal["easy", "medium", "hard"]


class CurriculumVariation(BaseModel):
    label: str = Field(min_length=1)
    transform: dict[str, float | int | bool | str] = Field(default_factory=dict)
    difficulty: DifficultyTag = "medium"
    rationale: str = ""


class CurriculumSpec(BaseModel):
    curriculum_id: str = Field(default_factory=lambda: new_id("curriculum"))
    task_name: str
    source_episode_ids: list[str] = Field(default_factory=list)
    variations: list[CurriculumVariation] = Field(min_length=1)
    model_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("variations")
    @classmethod
    def require_unique_labels(cls, variations: list[CurriculumVariation]) -> list[CurriculumVariation]:
        labels = [variation.label for variation in variations]
        if len(labels) != len(set(labels)):
            raise ValueError("Curriculum variation labels must be unique.")
        return variations
