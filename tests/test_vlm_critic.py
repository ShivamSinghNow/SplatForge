from pathlib import Path

from splatforge.contracts.critique import RolloutCritique
from splatforge.critics.vlm import VlmCritic
from splatforge.models import (
    AttemptStatus,
    Episode,
    Observation,
    RobotAction,
    TaskSpec,
)


def _episode(status: AttemptStatus, rgb_path: Path | None = None) -> Episode:
    return Episode(
        episode_id="episode_vlm_test",
        scene_id="scene_test",
        task=TaskSpec(name="pick_mug", object_name="mug", goal="pick"),
        robot_adapter="dry-run",
        policy_version="policy_v0",
        status=status,
        observation=Observation(
            rgb_path=rgb_path,
            physics_metrics={"contact_count": 0, "slip_velocity_m_s": 0.12},
        ),
        action=RobotAction(command="grasp"),
    )


def test_vlm_critic_disabled_uses_simulation_status():
    critic = VlmCritic(api_key=None)
    rollout = critic.score_rollout(_episode(AttemptStatus.FAILURE))
    assert rollout.passed is False
    assert rollout.difficulty_tag == "medium"


def test_vlm_critic_parses_structured_response(monkeypatch):
    critic = VlmCritic(api_key="test-key")

    def fake_call(_prompt: str) -> dict[str, object]:
        return {
            "passed": False,
            "rationale": "Gripper missed the handle because of occlusion.",
            "difficulty_tag": "hard",
            "evidence": ["handle not visible", "zero stable contacts"],
            "confidence": 0.82,
        }

    monkeypatch.setattr(critic, "_call_gemini_text", fake_call)
    rollout = critic.score_rollout(_episode(AttemptStatus.FAILURE))

    assert isinstance(rollout, RolloutCritique)
    assert rollout.passed is False
    assert rollout.difficulty_tag == "hard"
    assert "occlusion" in rollout.rationale
