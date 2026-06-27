"""Apply curriculum variations to the MuJoCo scene (SPL-8 / A2).

B2 emits `CurriculumVariation`s whose `transform` dict is LLM-authored and not
guaranteed to use a fixed key vocabulary — real Gemini returns things like
`{"yaw_rotation_deg": 45}` or `{"occlusion_intensity": "low"}`. The *label* is the
stable, enumerated signal, so A2 maps on the label and pulls values out of the
transform heuristically (with sane defaults). It bakes the scene-affecting result
into `SceneSpec.metadata`, which the MuJoCo backend reads when building the MJCF.
Policy-side deltas (approach height, grasp force) are returned by `policy_overrides`
for the loop (A6) / `update_policy` — A2 does not touch the policy.
"""

from __future__ import annotations

from splatforge.contracts.curriculum import CurriculumVariation
from splatforge.models import SceneSpec

_DEFAULT_YAW_DEG = 30.0
_DEFAULT_OCCLUDER_OFFSET_X_M = 0.04
_DEFAULT_CAMERA_YAW_DEG = 20.0


def _first_numeric(transform: dict, *substrings: str) -> float | None:
    for key, value in transform.items():
        lowered = key.lower()
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if any(sub in lowered for sub in substrings):
                return float(value)
    return None


def apply_variation(scene: SceneSpec, variation: CurriculumVariation) -> SceneSpec:
    """Return a copy of `scene` whose metadata encodes this variation's scene perturbations.

    The MuJoCo backend reads: `mug_xy`, `mug_yaw_deg`, `occluder`, `camera_yaw_deg`.
    """
    transform = variation.transform
    label = variation.label.lower()
    meta = dict(scene.metadata)

    # --- object yaw: explicit key, any yaw/rotation/angle number, or label implies it ---
    yaw = _first_numeric(transform, "yaw", "rotat", "angle")
    if yaw is None and ("rotate" in label or "yaw" in label):
        yaw = _DEFAULT_YAW_DEG
    if yaw is not None:
        meta["mug_yaw_deg"] = yaw

    # --- occluder: explicit flag or label implies occlusion ---
    if bool(transform.get("occluder_enabled")) or "occlu" in label:
        offset_x = _first_numeric(transform, "occluder_offset_x", "offset_x", "x_m")
        meta["occluder"] = {
            "enabled": True,
            "offset_x_m": offset_x if offset_x is not None else _DEFAULT_OCCLUDER_OFFSET_X_M,
            "offset_y_m": 0.0,
        }

    # --- camera angle ---
    if "camera" in label or any("camera" in key.lower() for key in transform):
        cam = _first_numeric(transform, "camera", "yaw", "angle")
        meta["camera_yaw_deg"] = cam if cam is not None else _DEFAULT_CAMERA_YAW_DEG

    # --- explicit mug placement ---
    if "mug_x_m" in transform or "mug_y_m" in transform:
        meta["mug_xy"] = [
            float(transform.get("mug_x_m", 0.0)),
            float(transform.get("mug_y_m", 0.0)),
        ]

    meta["curriculum"] = {
        "label": variation.label,
        "difficulty": variation.difficulty,
        "rationale": variation.rationale,
    }
    return scene.model_copy(update={"metadata": meta})


def policy_overrides(variation: CurriculumVariation) -> dict[str, float]:
    """Policy-side deltas (e.g. `approach_height_m_delta`) for the loop to apply.

    Not scene perturbations — returned so A6 / `update_policy` can adjust the policy.
    """
    return {
        key: float(value)
        for key, value in variation.transform.items()
        if key.endswith("_delta") and isinstance(value, (int, float)) and not isinstance(value, bool)
    }
