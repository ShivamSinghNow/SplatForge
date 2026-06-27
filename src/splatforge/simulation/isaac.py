from __future__ import annotations

import os
import platform

from splatforge.models import Episode, PolicyVersion, SceneSpec, TaskSpec
from splatforge.simulation.base import SimulationBackend


class IsaacSimulationBackend(SimulationBackend):
    name = "isaac"
    display_name = "Isaac Sim GPU backend"
    description = "NVIDIA GPU simulation backend for real robot manipulation episodes."

    def is_available(self) -> bool:
        return bool(os.getenv("ISAAC_SIM_PYTHON") or os.getenv("ISAAC_SIM_ROOT"))

    def status_message(self) -> str:
        if self.is_available():
            return "Isaac environment variables detected; backend scaffold is ready to wire."
        system = platform.system()
        if system == "Darwin":
            return "Isaac Sim requires a Linux/NVIDIA GPU runtime; use Digital Ocean GPU or a local Linux workstation."
        return "Set ISAAC_SIM_PYTHON or ISAAC_SIM_ROOT after installing Isaac Sim/Lab."

    def run_episode(
        self,
        scene: SceneSpec,
        task: TaskSpec,
        policy: PolicyVersion,
        variant_of: str | None = None,
        forced_failure: bool = False,
    ) -> Episode:
        raise RuntimeError(
            "IsaacSimulationBackend is scaffolded but not connected yet. "
            "Install Isaac Sim/Lab on an NVIDIA GPU machine, set ISAAC_SIM_PYTHON "
            "or ISAAC_SIM_ROOT, then wire scene loading and episode stepping here."
        )
