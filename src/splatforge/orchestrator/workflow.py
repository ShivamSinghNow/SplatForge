from __future__ import annotations

from pydantic import BaseModel

from splatforge.critics import (
    CriticCouncil,
    GeminiCritic,
    GemmaCritic,
    MiniMaxCritic,
    MonjuCritic,
    PhysicsCritic,
)
from splatforge.models import (
    AttemptStatus,
    Episode,
    FailureReport,
    PolicyVersion,
    PracticeVariant,
    SceneSpec,
    TaskSpec,
)
from splatforge.policy import DEFAULT_POLICY, update_policy
from splatforge.scanning import load_scene
from splatforge.sim import build_pick_task
from splatforge.simulation import SimulationBackend, build_simulation_backend
from splatforge.storage import Repository, build_repository
from splatforge.variants import generate_variants


class RunResult(BaseModel):
    initial_episode: Episode
    failure_report: FailureReport | None = None
    variants: list[PracticeVariant] = []
    updated_policy: PolicyVersion | None = None
    retest_episode: Episode | None = None


def run_practice_loop(
    scene_name: str,
    task_name: str,
    backend_name: str = "dry-run",
    robot_name: str | None = None,
    max_variants: int = 3,
    repository: Repository | None = None,
) -> RunResult:
    repository = repository or build_repository()
    scene = load_scene(scene_name)
    task = build_pick_task(task_name)
    policy = DEFAULT_POLICY
    backend = build_simulation_backend(robot_name or backend_name)

    repository.save("scans", scene)
    repository.save("policy_versions", policy)

    initial_episode = _attempt(backend, scene, task, policy, variant_of=None, forced_failure=True)
    repository.save("episodes", initial_episode)

    if initial_episode.status == AttemptStatus.SUCCESS:
        return RunResult(initial_episode=initial_episode)

    council = CriticCouncil(
        [PhysicsCritic(), GeminiCritic(), MiniMaxCritic(), GemmaCritic(), MonjuCritic()]
    )
    failure_report = council.review(initial_episode)
    repository.save("critiques", failure_report)
    for critique in failure_report.critic_outputs:
        repository.save("critic_outputs", critique)

    variants = generate_variants(scene.scene_id, failure_report, max_variants)
    for variant in variants:
        repository.save("variants", variant)

    updated_policy = update_policy(
        current=policy,
        report=failure_report,
        training_episode_ids=[initial_episode.episode_id],
    )
    repository.save("policy_versions", updated_policy)

    retest_episode = _attempt(
        backend,
        scene,
        task,
        updated_policy,
        variant_of=initial_episode.episode_id,
        forced_failure=False,
    )
    repository.save("episodes", retest_episode)

    return RunResult(
        initial_episode=initial_episode,
        failure_report=failure_report,
        variants=variants,
        updated_policy=updated_policy,
        retest_episode=retest_episode,
    )


def _attempt(
    backend: SimulationBackend,
    scene: SceneSpec,
    task: TaskSpec,
    policy: PolicyVersion,
    variant_of: str | None,
    forced_failure: bool,
) -> Episode:
    return backend.run_episode(
        scene=scene,
        task=task,
        policy=policy,
        variant_of=variant_of,
        forced_failure=forced_failure,
    )
