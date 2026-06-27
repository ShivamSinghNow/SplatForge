from __future__ import annotations

import json
import os
from typing import Any

from splatforge.config import GEMINI_CURRICULUM_MODEL
from splatforge.contracts.curriculum import CurriculumSpec, CurriculumVariation
from splatforge.critics.gemini import _parse_json_response
from splatforge.models import FailureReport, PracticeVariant, TaskSpec
from splatforge.variants.templates import VARIANT_TEMPLATES


class CurriculumGenerator:
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or GEMINI_CURRICULUM_MODEL

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def generate(
        self,
        task: TaskSpec,
        report: FailureReport,
        recent_failures: list[FailureReport] | None = None,
        max_variations: int = 3,
    ) -> CurriculumSpec:
        recent_failures = recent_failures or []
        if not self.enabled:
            return self._fallback_spec(task, report, max_variations)

        prompt = self._build_prompt(task, report, recent_failures, max_variations)
        try:
            payload = self._call_gemini(prompt)
            spec = CurriculumSpec.model_validate(
                {
                    **payload,
                    "task_name": task.name,
                    "source_episode_ids": [report.episode_id],
                    "model_id": self.model,
                }
            )
            spec.variations = spec.variations[:max_variations]
            return spec
        except Exception:
            return self._fallback_spec(task, report, max_variations)

    def to_practice_variants(self, scene_id: str, spec: CurriculumSpec) -> list[PracticeVariant]:
        variants: list[PracticeVariant] = []
        for variation in spec.variations:
            transform = variation.transform or VARIANT_TEMPLATES.get(
                variation.label,
                {"note": "manual_variant_required"},
            )
            variants.append(
                PracticeVariant(
                    scene_id=scene_id,
                    source_episode_id=spec.source_episode_ids[0] if spec.source_episode_ids else "",
                    label=variation.label,
                    transform=transform,
                    reason=variation.rationale or spec.task_name,
                )
            )
        return variants

    def _fallback_spec(
        self,
        task: TaskSpec,
        report: FailureReport,
        max_variations: int,
    ) -> CurriculumSpec:
        variations = [
            CurriculumVariation(
                label=label,
                transform=VARIANT_TEMPLATES.get(label, {"note": "manual_variant_required"}),
                difficulty="medium",
                rationale=report.root_cause,
            )
            for label in report.suggested_variants[:max_variations]
        ]
        if not variations:
            variations = [
                CurriculumVariation(
                    label="lower_approach_height",
                    transform=VARIANT_TEMPLATES["lower_approach_height"],
                    difficulty="easy",
                    rationale=report.root_cause,
                )
            ]
        return CurriculumSpec(
            task_name=task.name,
            source_episode_ids=[report.episode_id],
            variations=variations,
            model_id="template-fallback",
        )

    def _build_prompt(
        self,
        task: TaskSpec,
        report: FailureReport,
        recent_failures: list[FailureReport],
        max_variations: int,
    ) -> str:
        failure_context = [
            {
                "episode_id": failure.episode_id,
                "root_cause": failure.root_cause,
                "evidence": failure.evidence,
            }
            for failure in recent_failures[:5]
        ]
        known_labels = sorted(VARIANT_TEMPLATES)
        return (
            "You are SplatForge's curriculum designer.\n"
            "Given a robot task and recent failures, return ONLY valid JSON.\n"
            "No markdown, no prose outside JSON.\n\n"
            "JSON schema:\n"
            "{\n"
            '  "variations": [\n'
            "    {\n"
            '      "label": "lower_approach_height",\n'
            '      "transform": {"approach_height_m_delta": -0.04},\n'
            '      "difficulty": "easy",\n'
            '      "rationale": "why this practice scene helps"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Allowed labels when possible: {json.dumps(known_labels)}\n"
            f"Return at most {max_variations} variations ordered easiest to hardest.\n"
            f"Task JSON:\n{json.dumps(task.model_dump(mode='json'), indent=2)}\n\n"
            f"Primary failure JSON:\n{json.dumps(report.model_dump(mode='json'), indent=2)}\n\n"
            f"Recent failures JSON:\n{json.dumps(failure_context, indent=2)}"
        )

    def _call_gemini(self, prompt: str) -> dict[str, Any]:
        from google import genai

        client = genai.Client(api_key=self.api_key)
        result = client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        return _parse_json_response(result.text or "{}")
