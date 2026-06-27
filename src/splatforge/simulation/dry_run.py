from __future__ import annotations

from splatforge.models import Episode, PolicyVersion, SceneSpec, TaskSpec
from splatforge.robot import DryRunRobotAdapter
from splatforge.sim import evaluate_attempt, propose_action
from splatforge.simulation.base import SimulationBackend


class DryRunSimulationBackend(SimulationBackend):
    name = "dry-run"
    display_name = "Dry-run simulation preview"
    description = "Local deterministic backend for UI development before Isaac Sim is connected."

    def run_episode(
        self,
        scene: SceneSpec,
        task: TaskSpec,
        policy: PolicyVersion,
        variant_of: str | None = None,
        forced_failure: bool = False,
    ) -> Episode:
        robot = DryRunRobotAdapter(forced_failure=forced_failure)
        action = propose_action(task, policy.parameters)
        robot.execute_action(action)
        observation = robot.observe(scene, task)
        status = evaluate_attempt(observation)

        return Episode(
            scene_id=scene.scene_id,
            task=task,
            robot_adapter=self.name,
            policy_version=policy.policy_version,
            status=status,
            observation=observation,
            action=action,
            variant_of=variant_of,
        )
