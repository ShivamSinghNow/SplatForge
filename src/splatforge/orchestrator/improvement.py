"""Self-improvement orchestrator loop (SPL-12 / A6).

Ties the whole cycle together and writes per-iteration checkpoints:

    evaluate (A3 rate) -> critic reasoning (B3) -> curriculum (B2)
        -> write runs/<run_id>/iter_NN/{metrics.json, critic.txt}
        -> distill an improved policy -> repeat

The improvement is real, not scripted: each iteration analyzes the rollouts that
FAILED (how far the mug was out of grasp range) and widens the policy's grasp
tolerance just enough to cover them, via `update_policy`. So the measured success
rate climbs across iterations because the policy genuinely got better at the cases
it was missing — the embodied version of "train on your own failures."

(The distill here adjusts policy parameters; swapping in a real LoRA fine-tune is
A5. The critic and curriculum run on Gemini when GEMINI_API_KEY is set, else on
their graceful fallbacks, so the loop runs end-to-end with or without keys.)
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field

from splatforge.critics import VlmCritic
from splatforge.models import FailureReport, PolicyVersion, SceneSpec, TaskSpec, new_id, utc_now
from splatforge.orchestrator.evaluation import SuccessRateReport, evaluate_policy
from splatforge.orchestrator.replay import ReplayBuffer
from splatforge.policy import DEFAULT_POLICY, update_policy
from splatforge.sim import policy_overrides
from splatforge.simulation.base import SimulationBackend
from splatforge.storage import Repository, build_repository
from splatforge.variants import generate_curriculum

# grasp_radius = gripper_width * this (mirrors mujoco_sim); used to size the fix.
_GRASP_RADIUS_PER_WIDTH = 0.75
_MAX_WIDTH_STEP_M = 0.03
_SUGGESTED_LABELS = [
    "rotate_object_for_clearer_grasp",
    "add_handle_occlusion_practice",
    "lower_approach_height",
]


class IterationCheckpoint(BaseModel):
    iteration: int
    run_id: str
    success_rate: float
    n_rollouts: int
    adapter_path: str
    curriculum_ids: list[str] = Field(default_factory=list)
    policy_version: str
    timestamp: str
    artifact_dir: str


class ImprovementResult(BaseModel):
    run_id: str
    iterations: int
    checkpoints: list[IterationCheckpoint] = Field(default_factory=list)
    final_policy_version: str
    initial_success_rate: float
    final_success_rate: float


def run_improvement_loop(
    scene: SceneSpec,
    task: TaskSpec,
    backend: SimulationBackend,
    *,
    iterations: int = 5,
    n_rollouts: int = 30,
    seed: int = 0,
    run_id: str | None = None,
    runs_dir: str | Path = "runs",
    repository: Repository | None = None,
    critic: VlmCritic | None = None,
    use_critic: bool = True,
    policy: PolicyVersion | None = None,
) -> ImprovementResult:
    if iterations < 1:
        raise ValueError("iterations must be >= 1")

    run_id = run_id or new_id("run")
    repository = repository or build_repository()
    replay = ReplayBuffer(repository)
    critic = critic or VlmCritic()
    policy = policy or DEFAULT_POLICY
    base_dir = Path(runs_dir) / run_id

    checkpoints: list[IterationCheckpoint] = []

    for i in range(iterations):
        # 1. Measure the current policy — this rate is the checkpoint's y-value.
        report = evaluate_policy(
            scene, task, policy, backend,
            n_rollouts=n_rollouts, seed=seed,
            replay=replay, run_id=run_id, iteration=i,
        )

        # 2. Critic reasoning on one representative rollout (B3; Gemini or fallback).
        critic_text = _sample_critique(scene, task, policy, backend, critic) if use_critic else "critic disabled"

        # 3. Turn the failures into a report, then a curriculum (B2).
        failure_report = _summarize_failures(report, policy)
        curriculum = generate_curriculum(task, failure_report, max_variants=3)

        # 4. Persist the checkpoint artifact (CONTRACTS.md §3).
        artifact_dir = base_dir / f"iter_{i:02d}"
        checkpoint = IterationCheckpoint(
            iteration=i,
            run_id=run_id,
            success_rate=report.success_rate,
            n_rollouts=n_rollouts,
            adapter_path=f"adapters/{run_id}/iter_{i:02d}",
            curriculum_ids=[curriculum.curriculum_id],
            policy_version=policy.policy_version,
            timestamp=utc_now().isoformat(),
            artifact_dir=str(artifact_dir),
        )
        _write_iteration_artifacts(artifact_dir, checkpoint, critic_text)
        repository.save("checkpoints", checkpoint)
        checkpoints.append(checkpoint)

        # 5. Distill: widen grasp tolerance to cover the observed misses -> better policy.
        policy = _distill(policy, failure_report, curriculum)

    _write_curve(base_dir, checkpoints)

    return ImprovementResult(
        run_id=run_id,
        iterations=iterations,
        checkpoints=checkpoints,
        final_policy_version=policy.policy_version,
        initial_success_rate=checkpoints[0].success_rate,
        final_success_rate=checkpoints[-1].success_rate,
    )


def _summarize_failures(report: SuccessRateReport, policy: PolicyVersion) -> FailureReport:
    """Build a FailureReport whose policy_hints widen the grasp to cover the misses."""
    failed = [r for r in report.records if not r.success]
    miss_distances = sorted(abs(r.mug_x_m) for r in failed)
    median_miss = miss_distances[len(miss_distances) // 2] if miss_distances else 0.0

    current_width = float(policy.parameters.get("gripper_width_m", 0.06))
    width_to_cover_miss = median_miss / _GRASP_RADIUS_PER_WIDTH
    width_delta = round(max(0.0, min(width_to_cover_miss - current_width, _MAX_WIDTH_STEP_M)), 4)

    if failed:
        root_cause = "grasp tolerance too narrow for the object's displacement"
        evidence = [
            f"{len(failed)}/{report.n_rollouts} rollouts missed",
            f"median miss distance {median_miss:.3f} m vs grasp radius {current_width * _GRASP_RADIUS_PER_WIDTH:.3f} m",
        ]
    else:
        root_cause = "task solved at current difficulty"
        evidence = [f"all {report.n_rollouts} rollouts succeeded"]

    return FailureReport(
        episode_id=new_id("episode"),
        root_cause=root_cause,
        evidence=evidence,
        suggested_variants=_SUGGESTED_LABELS,
        policy_hints={"gripper_width_m_delta": width_delta},
        critic_outputs=[],
        confidence=0.6,
    )


def _distill(policy: PolicyVersion, failure_report: FailureReport, curriculum) -> PolicyVersion:
    """Apply the failure-driven width fix plus any policy-side curriculum deltas."""
    hints = dict(failure_report.policy_hints)
    for variation in curriculum.variations:
        for key, value in policy_overrides(variation).items():
            hints.setdefault(key, value)
    merged = failure_report.model_copy(update={"policy_hints": hints})
    return update_policy(policy, merged, training_episode_ids=[failure_report.episode_id])


def _sample_critique(
    scene: SceneSpec,
    task: TaskSpec,
    policy: PolicyVersion,
    backend: SimulationBackend,
    critic: VlmCritic,
) -> str:
    """Run one displaced rollout and have the critic explain it (reasoning only)."""
    sample_scene = scene.model_copy(update={"metadata": {**scene.metadata, "mug_xy": [0.08, 0.0]}})
    episode = backend.run_episode(sample_scene, task, policy)
    rollout = critic.score_rollout(episode)
    return (
        f"passed={rollout.passed}  difficulty={rollout.difficulty_tag}  confidence={rollout.confidence}\n"
        f"rationale: {rollout.rationale}\n"
        f"evidence: {rollout.evidence}"
    )


def _write_iteration_artifacts(artifact_dir: Path, checkpoint: IterationCheckpoint, critic_text: str) -> None:
    artifact_dir.mkdir(parents=True, exist_ok=True)
    metrics = {
        "iteration": checkpoint.iteration,
        "run_id": checkpoint.run_id,
        "success_rate": checkpoint.success_rate,
        "n_rollouts": checkpoint.n_rollouts,
        "adapter_path": checkpoint.adapter_path,
        "curriculum_ids": checkpoint.curriculum_ids,
        "timestamp": checkpoint.timestamp,
    }
    (artifact_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (artifact_dir / "critic.txt").write_text(critic_text, encoding="utf-8")
    # render.mp4 is produced by the visuals track (B-track) from the splat renderer.


def _write_curve(base_dir: Path, checkpoints: list[IterationCheckpoint]) -> None:
    base_dir.mkdir(parents=True, exist_ok=True)
    curve = [
        {"iteration": c.iteration, "success_rate": c.success_rate, "policy_version": c.policy_version}
        for c in checkpoints
    ]
    (base_dir / "curve.json").write_text(json.dumps(curve, indent=2), encoding="utf-8")
