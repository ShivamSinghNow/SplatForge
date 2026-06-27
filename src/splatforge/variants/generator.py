from __future__ import annotations

from splatforge.contracts.curriculum import CurriculumSpec
from splatforge.models import FailureReport, PracticeVariant, TaskSpec
from splatforge.variants.curriculum import CurriculumGenerator


def generate_curriculum(
    task: TaskSpec,
    report: FailureReport,
    recent_failures: list[FailureReport] | None = None,
    max_variants: int = 3,
    generator: CurriculumGenerator | None = None,
) -> CurriculumSpec:
    curriculum_generator = generator or CurriculumGenerator()
    return curriculum_generator.generate(
        task=task,
        report=report,
        recent_failures=recent_failures,
        max_variations=max_variants,
    )


def generate_variants(
    scene_id: str,
    report: FailureReport,
    max_variants: int,
    task: TaskSpec | None = None,
    recent_failures: list[FailureReport] | None = None,
    generator: CurriculumGenerator | None = None,
) -> list[PracticeVariant]:
    curriculum_generator = generator or CurriculumGenerator()
    spec = generate_curriculum(
        task=task or TaskSpec(name="pick_mug", object_name="mug", goal="pick"),
        report=report,
        recent_failures=recent_failures,
        max_variants=max_variants,
        generator=curriculum_generator,
    )
    return curriculum_generator.to_practice_variants(scene_id, spec)
