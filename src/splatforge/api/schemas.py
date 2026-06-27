from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, Field

from splatforge.gating import GatingFact, gating_facts, verify_h100_droplet, verify_splat_asset
from splatforge.models import AttemptStatus, CriticName
from splatforge.orchestrator import RunResult
from splatforge.scanning import load_scene


class RunRequest(BaseModel):
    scene: str = "mug_table"
    task: str = "pick_mug"
    backend: str = "dry-run"
    max_variants: int = Field(default=3, ge=1, le=10)


class SceneOption(BaseModel):
    id: str
    name: str
    path: str


class TaskOption(BaseModel):
    id: str
    name: str
    description: str


class EpisodeCard(BaseModel):
    status: AttemptStatus
    policy_version: str
    summary: str
    metrics: dict[str, float | int | bool | str]


class VariantCard(BaseModel):
    label: str
    reason: str
    transform: dict[str, float | int | bool | str]


class PolicyChange(BaseModel):
    parameter: str
    before: float
    after: float


class CriticCard(BaseModel):
    name: CriticName
    active: bool
    root_cause: str
    evidence: list[str]
    confidence: float


class IntegrationStatus(BaseModel):
    id: str
    label: str
    configured: bool
    purpose: str
    next_step: str


class FactsResponse(BaseModel):
    facts: list[GatingFact]


class RunSummary(BaseModel):
    run_id: str
    scene: str
    task: str
    backend: str
    phase: str
    timeline: list[str]
    initial_attempt: EpisodeCard
    failure_cause: str | None
    evidence: list[str]
    critics: list[CriticCard]
    variants: list[VariantCard]
    policy_changes: list[PolicyChange]
    retest: EpisodeCard | None
    log_collections: list[str]


class RerunRecordingMetadata(BaseModel):
    run_id: str
    exists: bool
    path: str | None = None
    viewer_url: str | None = None
    download_url: str | None = None
    file_url: str | None = None
    generated_at: str | None = None
    sdk_version: str = "unknown"
    viewer_mode: str = "embedded"
    frame_count: int = 0
    jump_frames: dict[str, int] = Field(default_factory=dict)
    score_before: float = 0.0
    score_after: float = 0.0
    scene: str | None = None
    task: str | None = None


class RerunHealthResponse(BaseModel):
    sdk_installed: bool
    sdk_version: str
    viewer_mode: str
    output_path: str
    recordings_count: int


def summarize_run(result: RunResult, run_id: str | None = None) -> RunSummary:
    run_id = run_id or f"run_{uuid4().hex[:12]}"
    initial = result.initial_episode
    retest = result.retest_episode
    report = result.failure_report

    return RunSummary(
        run_id=run_id,
        scene=initial.scene_id,
        task=initial.task.name,
        backend=initial.robot_adapter,
        phase="retest_success" if retest and retest.status == AttemptStatus.SUCCESS else "complete",
        timeline=_timeline(result),
        initial_attempt=_episode_card(initial),
        failure_cause=report.root_cause if report else None,
        evidence=report.evidence if report else [],
        critics=[
            CriticCard(
                name=critique.critic,
                active=critique.confidence > 0,
                root_cause=critique.root_cause,
                evidence=critique.evidence,
                confidence=critique.confidence,
            )
            for critique in report.critic_outputs
        ]
        if report
        else [],
        variants=[
            VariantCard(label=variant.label, reason=variant.reason, transform=variant.transform)
            for variant in result.variants
        ],
        policy_changes=_policy_changes(result),
        retest=_episode_card(retest) if retest else None,
        log_collections=[
            "scans",
            "episodes",
            "critiques",
            "critic_outputs",
            "variants",
            "policy_versions",
        ],
    )


def _episode_card(episode: object) -> EpisodeCard:
    from splatforge.models import Episode

    if not isinstance(episode, Episode):
        raise TypeError("episode must be an Episode")
    return EpisodeCard(
        status=episode.status,
        policy_version=episode.policy_version,
        summary=_attempt_summary(episode),
        metrics=episode.observation.physics_metrics,
    )


def _attempt_summary(episode: object) -> str:
    from splatforge.models import Episode

    if not isinstance(episode, Episode):
        raise TypeError("episode must be an Episode")
    metrics = episode.observation.physics_metrics
    if episode.status == AttemptStatus.SUCCESS:
        return "Object reached the goal with stable contact and no unsafe collision."

    height_cm = float(metrics.get("gripper_height_error_m", 0.0)) * 100
    contacts = int(metrics.get("contact_count", 0))
    return f"Failed with {height_cm:.1f}cm approach error and {contacts} stable contacts."


def _policy_changes(result: RunResult) -> list[PolicyChange]:
    if not result.updated_policy:
        return []

    before = result.initial_episode.action.parameters
    after = result.updated_policy.parameters
    changes: list[PolicyChange] = []
    for parameter, after_value in after.items():
        before_value = before.get(parameter)
        if not isinstance(before_value, int | float):
            continue
        if float(before_value) != after_value:
            changes.append(
                PolicyChange(
                    parameter=parameter,
                    before=float(before_value),
                    after=after_value,
                )
            )
    return changes


def _timeline(result: RunResult) -> list[str]:
    steps = ["Attempt"]
    if result.failure_report:
        steps.append("Critique")
    if result.variants:
        steps.append("Variants")
    if result.updated_policy:
        steps.append("Policy Update")
    if result.retest_episode:
        steps.append("Retest")
    return steps


def scene_options(root: Path = Path("demo/scenes")) -> list[SceneOption]:
    return [
        SceneOption(id=path.stem, name=path.stem.replace("_", " ").title(), path=str(path))
        for path in sorted(root.glob("*.json"))
    ]


def task_options() -> list[TaskOption]:
    return [
        TaskOption(
            id="pick_mug",
            name="Pick Mug",
            description="Pick up a mug from the tabletop and move it to the goal zone.",
        )
    ]


def integration_statuses() -> list[IntegrationStatus]:
    scene = load_scene("mug_table")
    splat_fact = verify_splat_asset(scene)
    h100_fact = verify_h100_droplet()
    from splatforge.rerun.service import rerun_sdk_installed

    rerun_ready = rerun_sdk_installed()
    return [
        IntegrationStatus(
            id="rerun",
            label="Rerun",
            configured=rerun_ready,
            purpose="Primary 3D robotics telemetry viewer for rollouts, critics, and policy timelines.",
            next_step="rerun-sdk is ready — generate a recording from any training run.",
        ),
        IntegrationStatus(
            id="gemini",
            label="Gemini",
            configured=bool(os.getenv("GEMINI_API_KEY")),
            purpose="Primary robot failure critic and variant planner.",
            next_step="Set GEMINI_API_KEY in .env to enable structured AI critique.",
        ),
        IntegrationStatus(
            id="minimax",
            label="MiniMax",
            configured=bool(os.getenv("MINIMAX_API_KEY")),
            purpose="Optional second critic and creative scenario generator.",
            next_step="Set MINIMAX_API_KEY after the Gemini flow is working.",
        ),
        IntegrationStatus(
            id="mongodb",
            label="MongoDB Atlas",
            configured=bool(os.getenv("MONGODB_URI")),
            purpose="Cloud episode logs and judge-friendly evidence trail.",
            next_step="Set MONGODB_URI when you want runs stored in Atlas.",
        ),
        IntegrationStatus(
            id="isaac",
            label="Isaac Sim",
            configured=bool(os.getenv("ISAAC_SIM_ROOT") or os.getenv("ISAAC_SIM_PYTHON")),
            purpose="NVIDIA GPU simulation backend for real physics episodes.",
            next_step="Set ISAAC_SIM_ROOT or ISAAC_SIM_PYTHON on a Linux/NVIDIA machine.",
        ),
        IntegrationStatus(
            id="digitalocean_h100",
            label="DigitalOcean H100",
            configured=h100_fact.verified,
            purpose="Verified remote NVIDIA H100 runtime for Isaac GPU simulation.",
            next_step=h100_fact.next_step,
        ),
        IntegrationStatus(
            id="splat_asset",
            label="Gaussian Splat Asset",
            configured=splat_fact.verified,
            purpose="Real reconstructed tabletop asset loaded from the scene config.",
            next_step=splat_fact.next_step,
        ),
    ]


def fact_statuses(scene_name: str = "mug_table") -> FactsResponse:
    return FactsResponse(facts=gating_facts(load_scene(scene_name)))
