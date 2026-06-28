"""MiniMax critic — a second, independent LLM critic in the AI council.

Calls MiniMax's OpenAI-compatible chat-completions API to grade a robot episode
and return the same Critique schema as the Gemini critic, so the council can
aggregate multiple independent opinions. Skips cleanly if MINIMAX_API_KEY is
unset; never raises into the robot loop.
"""

from __future__ import annotations

import json
import os

from splatforge.config import MINIMAX_BASE_URL, MINIMAX_CRITIC_MODEL
from splatforge.critics.base import Critic
from splatforge.critics.gemini import _parse_json_response
from splatforge.models import CriticName, Critique, Episode


class MiniMaxCritic(Critic):
    def __init__(self, api_key: str | None = None, model: str | None = None, base_url: str | None = None) -> None:
        self.api_key = api_key or os.getenv("MINIMAX_API_KEY")
        self.model = model or MINIMAX_CRITIC_MODEL
        self.base_url = (base_url or MINIMAX_BASE_URL).rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def critique(self, episode: Episode) -> Critique:
        if not self.enabled:
            return Critique(
                episode_id=episode.episode_id,
                critic=CriticName.MINIMAX,
                root_cause="MiniMax critic skipped because MINIMAX_API_KEY is not configured.",
                evidence=["Set MINIMAX_API_KEY to enable the second independent critic."],
                suggested_variants=[],
                confidence=0.0,
                raw={"enabled": False},
            )

        prompt = self._build_prompt(episode)
        try:
            response = self._call_minimax(prompt)
        except Exception as exc:  # External API errors must not break the robot loop.
            return Critique(
                episode_id=episode.episode_id,
                critic=CriticName.MINIMAX,
                root_cause="MiniMax critic failed during API call.",
                evidence=[str(exc)],
                suggested_variants=[],
                confidence=0.0,
                raw={"error": str(exc)},
            )

        return Critique(
            episode_id=episode.episode_id,
            critic=CriticName.MINIMAX,
            root_cause=response.get("root_cause", "MiniMax did not return a root cause."),
            evidence=list(response.get("evidence", [])),
            suggested_variants=list(response.get("suggested_variants", [])),
            policy_hints=dict(response.get("policy_hints", {})),
            confidence=float(response.get("confidence", 0.5)),
            raw=response,
        )

    def _build_prompt(self, episode: Episode) -> str:
        payload = episode.model_dump(mode="json")
        return (
            "You are MiniMax acting as a SECOND, INDEPENDENT critic on SplatForge's robot "
            "failure council (the first opinion comes from Gemini). Give your own honest "
            "diagnosis -- do not assume the other critics are right. Return ONLY valid JSON, "
            "no markdown.\n\n"
            "Goal:\n"
            "- Explain the root cause of the failed robot manipulation attempt.\n"
            "- Propose targeted simulation variants that would create useful practice data.\n"
            "- Suggest small numeric policy adapter deltas only when the evidence supports them.\n\n"
            "JSON schema:\n"
            "{\n"
            '  "root_cause": "short concrete failure explanation",\n'
            '  "evidence": ["observable evidence from metrics/state"],\n'
            '  "suggested_variants": ["lower_approach_height", "rotate_object_for_clearer_grasp", '
            '"add_handle_occlusion_practice", "increase_grasp_force", "change_camera_angle"],\n'
            '  "policy_hints": {"approach_height_m_delta": -0.04, "wrist_yaw_deg_delta": 15.0, '
            '"gripper_width_m_delta": 0.01},\n'
            '  "confidence": 0.0\n'
            "}\n\n"
            "Use confidence between 0 and 1.\n\n"
            f"Episode JSON:\n{json.dumps(payload, indent=2)}"
        )

    def _call_minimax(self, prompt: str) -> dict[str, object]:
        import requests

        url = f"{self.base_url}/text/chatcompletion_v2"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        body = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are MiniMax, an independent robotics failure critic. Reply with ONLY valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        resp = requests.post(url, json=body, headers=headers, timeout=40)
        resp.raise_for_status()
        data = resp.json()
        base_resp = data.get("base_resp") or {}
        status = base_resp.get("status_code")
        if status not in (0, None):
            raise RuntimeError(f"MiniMax API error {status}: {base_resp.get('status_msg')}")
        content = data["choices"][0]["message"]["content"]
        return _parse_json_response(content)
