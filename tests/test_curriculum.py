from splatforge.config import GEMINI_CURRICULUM_MODEL
from splatforge.contracts.curriculum import CurriculumSpec, CurriculumVariation
from splatforge.models import FailureReport, TaskSpec
from splatforge.variants.curriculum import CurriculumGenerator


def test_curriculum_spec_validates_unique_labels():
    try:
        CurriculumSpec(
            task_name="pick_mug",
            variations=[
                CurriculumVariation(label="lower_approach_height"),
                CurriculumVariation(label="lower_approach_height"),
            ],
            model_id=GEMINI_CURRICULUM_MODEL,
        )
    except ValueError as exc:
        assert "unique" in str(exc).lower()
    else:
        raise AssertionError("Expected duplicate labels to fail validation")


def test_curriculum_generator_fallback_without_api_key():
    task = TaskSpec(name="pick_mug", object_name="mug", goal="pick")
    report = FailureReport(
        episode_id="episode_test",
        root_cause="grasp slipped",
        evidence=["slip detected"],
        suggested_variants=["lower_approach_height", "increase_grasp_force"],
        policy_hints={},
        critic_outputs=[],
        confidence=0.8,
    )
    generator = CurriculumGenerator(api_key=None)
    spec = generator.generate(task, report, max_variations=2)

    assert spec.task_name == "pick_mug"
    assert len(spec.variations) == 2
    assert spec.model_id == "template-fallback"
    variants = generator.to_practice_variants("scene_mug_table", spec)
    assert len(variants) == 2
    assert variants[0].label == "lower_approach_height"


def test_curriculum_generator_parses_gemini_payload(monkeypatch):
    task = TaskSpec(name="pick_mug", object_name="mug", goal="pick")
    report = FailureReport(
        episode_id="episode_test",
        root_cause="occluded handle",
        evidence=["handle blocked"],
        suggested_variants=[],
        policy_hints={},
        critic_outputs=[],
        confidence=0.7,
    )
    generator = CurriculumGenerator(api_key="test-key")

    def fake_call(_prompt: str) -> dict[str, object]:
        return {
            "variations": [
                {
                    "label": "add_handle_occlusion_practice",
                    "transform": {"occluder_enabled": True},
                    "difficulty": "hard",
                    "rationale": "Practice grasping around the occluder.",
                }
            ]
        }

    monkeypatch.setattr(generator, "_call_gemini", fake_call)
    spec = generator.generate(task, report, max_variations=1)

    assert spec.model_id == GEMINI_CURRICULUM_MODEL
    assert spec.variations[0].difficulty == "hard"
    assert spec.variations[0].label == "add_handle_occlusion_practice"
