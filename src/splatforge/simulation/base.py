from __future__ import annotations

from abc import ABC, abstractmethod

from splatforge.models import Episode, PolicyVersion, SceneSpec, TaskSpec


class SimulationBackend(ABC):
    name: str
    display_name: str
    description: str

    @abstractmethod
    def run_episode(
        self,
        scene: SceneSpec,
        task: TaskSpec,
        policy: PolicyVersion,
        variant_of: str | None = None,
        forced_failure: bool = False,
    ) -> Episode:
        raise NotImplementedError

    def is_available(self) -> bool:
        return True

    def status_message(self) -> str:
        return "Ready"

    def metadata(self) -> dict[str, str | bool]:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "available": self.is_available(),
            "status": self.status_message(),
        }
