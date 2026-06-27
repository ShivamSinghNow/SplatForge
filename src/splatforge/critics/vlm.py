from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from splatforge.config import GEMINI_VLM_MODEL
from splatforge.contracts.critique import RolloutCritique
from splatforge.critics.base import Critic
from splatforge.critics.gemini import _parse_json_response
from splatforge.models import CriticName, Critique, Episode


class VlmCritic(Critic):
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or GEMINI_VLM_MODEL

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def critique(self, episode: Episode) -> Critique:
        if not self.enabled:
            return self._disabled_critique(episode)

        prompt = self._build_prompt(episode)
        image_path = episode.observation.rgb_path
        try:
            if image_path and Path(image_path).exists():
                payload = self._call_gemini_multimodal(prompt, Path(image_path))
            else:
                payload = self._call_gemini_text(prompt)
            rollout = RolloutCritique.model_validate(payload)
        except Exception as exc:
            return Critique(
                episode_id=episode.episode_id,
                critic=CriticName.VLM,
                root_cause="VLM critic failed during rollout review.",
                evidence=[str(exc)],
                suggested_variants=[],
                confidence=0.0,
                raw={"error": str(exc)},
            )

        return Critique(
            episode_id=episode.episode_id,
            critic=CriticName.VLM,
            root_cause=rollout.rationale,
            evidence=rollout.evidence,
            suggested_variants=[],
            policy_hints={"passed": rollout.passed, "difficulty_tag": rollout.difficulty_tag},
            confidence=rollout.confidence,
            raw=rollout.model_dump(mode="json"),
        )

    def score_rollout(self, episode: Episode) -> RolloutCritique:
        critique = self.critique(episode)
        passed = bool(critique.policy_hints.get("passed", episode.status.value == "success"))
        difficulty = critique.policy_hints.get("difficulty_tag", "medium")
        return RolloutCritique(
            passed=passed,
            rationale=critique.root_cause,
            difficulty_tag=str(difficulty),  # type: ignore[arg-type]
            evidence=critique.evidence,
            confidence=critique.confidence,
        )

    def _disabled_critique(self, episode: Episode) -> Critique:
        passed = episode.status.value == "success"
        return Critique(
            episode_id=episode.episode_id,
            critic=CriticName.VLM,
            root_cause=(
                "VLM critic skipped because GEMINI_API_KEY is not configured; "
                "using simulation status as pass/fail."
            ),
            evidence=[f"simulation_status={episode.status.value}"],
            suggested_variants=[],
            policy_hints={"passed": passed, "difficulty_tag": "medium"},
            confidence=0.2,
            raw={"enabled": False},
        )

    def _build_prompt(self, episode: Episode) -> str:
        metrics = episode.observation.physics_metrics
        return (
            "You are SplatForge's rollout self-critic.\n"
            "Review this robot manipulation rollout and return ONLY valid JSON.\n"
            "Ground truth simulation success drives training curves; you provide "
            "reasoning and curriculum signal.\n\n"
            "JSON schema:\n"
            "{\n"
            '  "passed": false,\n'
            '  "rationale": "why the rollout succeeded or failed",\n'
            '  "difficulty_tag": "easy",\n'
            '  "evidence": ["visible or metric evidence"],\n'
            '  "confidence": 0.0\n'
            "}\n\n"
            f"Episode status: {episode.status.value}\n"
            f"Physics metrics JSON:\n{json.dumps(metrics, indent=2)}\n"
            f"Robot state JSON:\n{json.dumps(episode.observation.robot_state, indent=2)}"
        )

    def _call_gemini_text(self, prompt: str) -> dict[str, Any]:
        from google import genai

        client = genai.Client(api_key=self.api_key)
        result = client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        return _parse_json_response(result.text or "{}")

    def _call_gemini_multimodal(self, prompt: str, image_path: Path) -> dict[str, Any]:
        from google import genai
        from google.genai import types

        image_bytes = image_path.read_bytes()
        mime_type = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
        client = genai.Client(api_key=self.api_key)
        result = client.models.generate_content(
            model=self.model,
            contents=[
                types.Part.from_text(text=prompt),
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
            config={"response_mime_type": "application/json"},
        )
        return _parse_json_response(result.text or "{}")
