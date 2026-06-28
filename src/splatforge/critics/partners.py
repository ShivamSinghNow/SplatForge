from __future__ import annotations

import os

from splatforge.critics.base import Critic
from splatforge.models import CriticName, Critique, Episode


class _PartnerPlaceholderCritic(Critic):
    critic_name: CriticName
    env_var: str
    role: str

    def critique(self, episode: Episode) -> Critique:
        if os.getenv(self.env_var):
            return Critique(
                episode_id=episode.episode_id,
                critic=self.critic_name,
                root_cause=f"{self.critic_name.value} integration is configured but not implemented yet.",
                evidence=[f"{self.env_var} is present; wire the provider SDK in this critic next."],
                confidence=0.0,
                raw={"configured": True, "role": self.role},
            )

        return Critique(
            episode_id=episode.episode_id,
            critic=self.critic_name,
            root_cause=f"{self.critic_name.value} critic skipped because {self.env_var} is not configured.",
            evidence=[f"Configure {self.env_var} when you want {self.role}."],
            confidence=0.0,
            raw={"configured": False, "role": self.role},
        )


class GemmaCritic(_PartnerPlaceholderCritic):
    critic_name = CriticName.GEMMA
    env_var = "GEMMA_ENDPOINT"
    role = "a local or self-hosted critic fallback"


class MonjuCritic(_PartnerPlaceholderCritic):
    critic_name = CriticName.MONJU
    env_var = "MONJU_ENDPOINT"
    role = "a specialist reasoning or sponsor-provided critic"
