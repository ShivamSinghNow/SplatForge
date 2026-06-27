from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, Field

from splatforge.models import new_id


class FailureRecord(BaseModel):
    record_id: str = Field(default_factory=lambda: new_id("failure"))
    episode_id: str
    root_cause: str
    evidence: list[str] = Field(default_factory=list)
    note: str = ""
    embedding: list[float] = Field(default_factory=list)
    embedding_model: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def search_text(self) -> str:
        parts = [self.root_cause, self.note, *self.evidence]
        return " ".join(part for part in parts if part)
