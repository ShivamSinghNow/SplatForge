"""A2 (SPL-8): generate a curriculum (B2 / real Gemini) and apply each variation
to the MuJoCo scene, then run a rollout in each perturbed scene.

    python scripts/curriculum_demo.py

Reads .env for GEMINI_API_KEY. If present, B2 calls Gemini and the curriculum's
model_id is the Gemini model; otherwise it uses the template fallback.
"""

from __future__ import annotations

from dotenv import load_dotenv

from splatforge.models import FailureReport, PolicyVersion
from splatforge.policy import DEFAULT_POLICY
from splatforge.scanning.scenes import load_scene
from splatforge.sim import apply_variation, policy_overrides
from splatforge.sim.task import build_pick_task
from splatforge.simulation.mujoco_sim import MujocoSimulationBackend
from splatforge.variants import generate_curriculum


def main() -> int:
    load_dotenv()

    backend = MujocoSimulationBackend()
    if not backend.is_available():
        print(f"[mujoco] {backend.status_message()}")
        return 2

    scene = load_scene("mug_table")
    task = build_pick_task("pick_up_mug")

    # A realistic failure to seed the curriculum generator.
    report = FailureReport(
        episode_id="ep_demo",
        root_cause="gripper approached too high and missed the mug handle",
        evidence=["mug not lifted", "approach_height too large", "handle partially occluded"],
        suggested_variants=[
            "rotate_object_for_clearer_grasp",
            "add_handle_occlusion_practice",
            "lower_approach_height",
        ],
        policy_hints={},
        critic_outputs=[],
        confidence=0.6,
    )

    spec = generate_curriculum(task, report, max_variants=3)
    used_gemini = spec.model_id not in ("template-fallback",)
    print(f"curriculum_id={spec.curriculum_id}")
    print(f"model_id={spec.model_id}  (real Gemini: {used_gemini})")
    print(f"variations={len(spec.variations)}")

    policy: PolicyVersion = DEFAULT_POLICY
    for variation in spec.variations:
        perturbed = apply_variation(scene, variation)
        episode = backend.run_episode(perturbed, task, policy)
        m = episode.observation.physics_metrics
        print(f"\n- {variation.label}  [{variation.difficulty}]")
        print(f"  transform={variation.transform}")
        print(f"  scene  -> mug_yaw_deg={m['mug_yaw_deg']}  occluder={m['occluder_present']}")
        print(f"  policy -> overrides={policy_overrides(variation)}")
        print(f"  rollout success={m['success']}  (mug_lift_m={m['mug_lift_m']:.3f})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
