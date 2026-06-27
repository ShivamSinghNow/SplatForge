from __future__ import annotations

from statistics import mean

from splatforge.critics.base import Critic
from splatforge.models import Episode, FailureReport


class CriticCouncil:
    def __init__(self, critics: list[Critic]) -> None:
        self.critics = critics

    def review(self, episode: Episode) -> FailureReport:
        critiques = [critic.critique(episode) for critic in self.critics]
        usable = [critique for critique in critiques if critique.confidence > 0]
        primary = max(usable or critiques, key=lambda critique: critique.confidence)

        evidence = _dedupe(item for critique in usable for item in critique.evidence)
        variants = _dedupe(item for critique in usable for item in critique.suggested_variants)
        hints: dict[str, float | int | bool | str] = {}
        for critique in usable:
            hints.update(critique.policy_hints)

        return FailureReport(
            episode_id=episode.episode_id,
            root_cause=primary.root_cause,
            evidence=evidence or primary.evidence,
            suggested_variants=variants or primary.suggested_variants,
            policy_hints=hints,
            critic_outputs=critiques,
            confidence=mean([critique.confidence for critique in usable]) if usable else 0.0,
        )


def _dedupe(items: object) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for item in items:
        value = str(item)
        if value not in seen:
            seen.add(value)
            deduped.append(value)
    return deduped
