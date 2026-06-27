from __future__ import annotations

from pydantic import BaseModel, Field

from splatforge.contracts.curriculum import DifficultyTag


class RolloutCritique(BaseModel):
    passed: bool
    rationale: str
    difficulty_tag: DifficultyTag = "medium"
    evidence: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
