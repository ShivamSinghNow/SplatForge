"""A2 (SPL-8): curriculum variations apply to the MuJoCo scene."""

from __future__ import annotations

import pytest

from splatforge.contracts.curriculum import CurriculumVariation
from splatforge.models import PolicyVersion, SceneSpec, TaskSpec
from splatforge.sim import apply_variation, policy_overrides
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend

pytestmark = pytest.mark.skipif(
    not MujocoSimulationBackend().is_available(),
    reason="mujoco not installed",
)


def _scene() -> SceneSpec:
    return SceneSpec(scene_id="scene_test", name="test", splat_asset="demo/assets/x.splat")


def _task() -> TaskSpec:
    return TaskSpec(name="pick_up_mug", object_name="mug", goal="lift the mug")


def _policy() -> PolicyVersion:
    return PolicyVersion(policy_version="p", parameters={"gripper_width_m": 0.10, "approach_height_m": 0.30})


def test_object_yaw_variation_sets_scene_and_is_built() -> None:
    variation = CurriculumVariation(
        label="rotate_object_for_clearer_grasp",
        transform={"object_yaw_deg": 45.0},
        difficulty="medium",
    )
    scene = apply_variation(_scene(), variation)
    assert scene.metadata["mug_yaw_deg"] == 45.0
    assert scene.metadata["curriculum"]["label"] == "rotate_object_for_clearer_grasp"

    episode = MujocoSimulationBackend().run_episode(scene, _task(), _policy())
    assert episode.observation.physics_metrics["mug_yaw_deg"] == 45.0


def test_occluder_variation_is_built_into_the_scene() -> None:
    variation = CurriculumVariation(
        label="add_handle_occlusion_practice",
        transform={"occluder_enabled": True, "occluder_offset_x_m": 0.05},
        difficulty="hard",
    )
    scene = apply_variation(_scene(), variation)
    assert scene.metadata["occluder"]["enabled"] is True

    episode = MujocoSimulationBackend().run_episode(scene, _task(), _policy())
    assert episode.observation.physics_metrics["occluder_present"] is True


def test_policy_side_variation_leaves_scene_unperturbed() -> None:
    variation = CurriculumVariation(
        label="lower_approach_height",
        transform={"approach_height_m_delta": -0.04},
        difficulty="easy",
    )
    assert policy_overrides(variation) == {"approach_height_m_delta": -0.04}

    scene = apply_variation(_scene(), variation)
    assert "mug_yaw_deg" not in scene.metadata
    assert "occluder" not in scene.metadata


def test_perturbed_scene_still_produces_a_success_bool() -> None:
    variation = CurriculumVariation(
        label="add_handle_occlusion_practice",
        transform={"occluder_enabled": True},
        difficulty="hard",
    )
    scene = apply_variation(_scene(), variation)
    episode = MujocoSimulationBackend().run_episode(scene, _task(), _policy())
    assert isinstance(episode.observation.physics_metrics["success"], bool)


def test_handles_gemini_freeform_transform_keys() -> None:
    # Real Gemini does not stick to a fixed transform vocabulary; map on the label.
    rotated = apply_variation(
        _scene(),
        CurriculumVariation(
            label="rotate_object_for_clearer_grasp",
            transform={"yaw_rotation_deg": 45.0},  # not "object_yaw_deg"
            difficulty="medium",
        ),
    )
    assert rotated.metadata["mug_yaw_deg"] == 45.0

    occluded = apply_variation(
        _scene(),
        CurriculumVariation(
            label="add_handle_occlusion_practice",
            transform={"occlusion_intensity": "low"},  # non-numeric, no canonical key
            difficulty="hard",
        ),
    )
    assert occluded.metadata["occluder"]["enabled"] is True
