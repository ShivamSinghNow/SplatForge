from __future__ import annotations

from abc import ABC, abstractmethod

from splatforge.models import Observation, RobotAction, SceneSpec, TaskSpec


class RobotAdapter(ABC):
    name: str

    @abstractmethod
    def observe(self, scene: SceneSpec, task: TaskSpec) -> Observation:
        raise NotImplementedError

    @abstractmethod
    def execute_action(self, action: RobotAction) -> None:
        raise NotImplementedError

    @abstractmethod
    def reset(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def emergency_stop(self) -> None:
        raise NotImplementedError
