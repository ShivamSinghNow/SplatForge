from __future__ import annotations

from splatforge.models import FailureReport, PracticeVariant


VARIANT_TEMPLATES: dict[str, dict[str, float | int | bool | str]] = {
    "lower_approach_height": {"approach_height_m_delta": -0.04},
    "rotate_object_for_clearer_grasp": {"object_yaw_deg": 30.0},
    "add_handle_occlusion_practice": {"occluder_enabled": True, "occluder_offset_x_m": 0.04},
    "increase_grasp_force": {"grasp_force_delta": 0.1},
    "change_camera_angle": {"camera_yaw_deg": 20.0},
}


def generate_variants(
    scene_id: str,
    report: FailureReport,
    max_variants: int,
) -> list[PracticeVariant]:
    variants: list[PracticeVariant] = []
    for label in report.suggested_variants[:max_variants]:
        transform = VARIANT_TEMPLATES.get(label, {"note": "manual_variant_required"})
        variants.append(
            PracticeVariant(
                scene_id=scene_id,
                source_episode_id=report.episode_id,
                label=label,
                transform=transform,
                reason=report.root_cause,
            )
        )
    return variants
