from __future__ import annotations

from abc import ABC, abstractmethod

from splatforge.models import Critique, Episode


class Critic(ABC):
    @abstractmethod
    def critique(self, episode: Episode) -> Critique:
        raise NotImplementedError
