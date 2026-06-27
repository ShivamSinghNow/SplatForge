from __future__ import annotations

import json
import os
import re
from typing import Any

from splatforge.critics.base import Critic
from splatforge.models import CriticName, Critique, Episode


class GeminiCritic(Critic):
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def critique(self, episode: Episode) -> Critique:
        if not self.enabled:
            return Critique(
                episode_id=episode.episode_id,
                critic=CriticName.GEMINI,
                root_cause="Gemini critic skipped because GEMINI_API_KEY is not configured.",
                evidence=["Set GEMINI_API_KEY to enable multimodal failure analysis."],
                suggested_variants=[],
                confidence=0.0,
                raw={"enabled": False},
            )

        prompt = self._build_prompt(episode)
        try:
            response = self._call_gemini(prompt)
        except Exception as exc:  # External SDK/API errors should not break the robot loop.
            return Critique(
                episode_id=episode.episode_id,
                critic=CriticName.GEMINI,
                root_cause="Gemini critic failed during API call.",
                evidence=[str(exc)],
                suggested_variants=[],
                confidence=0.0,
                raw={"error": str(exc)},
            )

        return Critique(
            episode_id=episode.episode_id,
            critic=CriticName.GEMINI,
            root_cause=response.get("root_cause", "Gemini did not return a root cause."),
            evidence=list(response.get("evidence", [])),
            suggested_variants=list(response.get("suggested_variants", [])),
            policy_hints=dict(response.get("policy_hints", {})),
            confidence=float(response.get("confidence", 0.5)),
            raw=response,
        )

    def _build_prompt(self, episode: Episode) -> str:
        payload = episode.model_dump(mode="json")
        return (
            "You are Gemini acting as SplatForge's robot failure scientist.\n"
            "Analyze this simulated robot manipulation episode and return ONLY valid JSON.\n"
            "No markdown, no prose outside JSON.\n\n"
            "Goal:\n"
            "- Explain the root cause of the failed robot attempt.\n"
            "- Propose targeted simulation variants that would create useful practice data.\n"
            "- Suggest small numeric policy adapter deltas when supported by evidence.\n\n"
            "JSON schema:\n"
            "{\n"
            '  "root_cause": "short concrete failure explanation",\n'
            '  "evidence": ["observable evidence from metrics/state"],\n'
            '  "suggested_variants": [\n'
            '    "lower_approach_height",\n'
            '    "rotate_object_for_clearer_grasp",\n'
            '    "add_handle_occlusion_practice",\n'
            '    "increase_grasp_force",\n'
            '    "change_camera_angle"\n'
            "  ],\n"
            '  "policy_hints": {\n'
            '    "approach_height_m_delta": -0.04,\n'
            '    "wrist_yaw_deg_delta": 15.0,\n'
            '    "gripper_width_m_delta": 0.01\n'
            "  },\n"
            '  "confidence": 0.0\n'
            "}\n\n"
            "Only include policy_hints that are justified by the episode. "
            "Use confidence between 0 and 1.\n\n"
            f"Episode JSON:\n{json.dumps(payload, indent=2)}"
        )

    def _call_gemini(self, prompt: str) -> dict[str, object]:
        from google import genai

        client = genai.Client(api_key=self.api_key)
        result = client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        text = result.text or "{}"
        return _parse_json_response(text)


def _strip_json_fence(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```json"):
        return stripped.removeprefix("```json").removesuffix("```").strip()
    if stripped.startswith("```"):
        return stripped.removeprefix("```").removesuffix("```").strip()
    return stripped


def _parse_json_response(text: str) -> dict[str, Any]:
    stripped = _strip_json_fence(text)
    try:
        payload = json.loads(stripped)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
        if not match:
            raise
        payload = json.loads(match.group(0))
    if not isinstance(payload, dict):
        raise ValueError("Gemini response was not a JSON object.")
    return payload
