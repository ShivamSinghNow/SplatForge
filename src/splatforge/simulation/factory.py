from __future__ import annotations

from splatforge.simulation.base import SimulationBackend
from splatforge.simulation.dry_run import DryRunSimulationBackend
from splatforge.simulation.isaac import IsaacSimulationBackend


def list_simulation_backends() -> list[dict[str, str | bool]]:
    return [backend.metadata() for backend in _available_backend_instances()]


def build_simulation_backend(name: str) -> SimulationBackend:
    for backend in _available_backend_instances():
        if backend.name == name:
            return backend
    supported = ", ".join(backend.name for backend in _available_backend_instances())
    raise ValueError(f"Unsupported simulation backend '{name}'. Supported: {supported}")


def _available_backend_instances() -> list[SimulationBackend]:
    return [DryRunSimulationBackend(), IsaacSimulationBackend()]
