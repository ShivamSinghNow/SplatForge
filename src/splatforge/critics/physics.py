from __future__ import annotations

from splatforge.critics.base import Critic
from splatforge.models import CriticName, Critique, Episode


class PhysicsCritic(Critic):
    def critique(self, episode: Episode) -> Critique:
        metrics = episode.observation.physics_metrics
        evidence: list[str] = []
        variants: list[str] = []
        hints: dict[str, float | int | bool | str] = {}

        height_error = float(metrics.get("gripper_height_error_m", 0.0))
        contact_count = int(metrics.get("contact_count", 0))
        slip_velocity = float(metrics.get("slip_velocity_mps", 0.0))
        handle_occluded = bool(metrics.get("handle_occluded", False))

        if height_error > 0.04:
            evidence.append(f"Gripper approach height error was {height_error:.3f}m.")
            variants.append("lower_approach_height")
            hints["approach_height_m_delta"] = -0.04

        if contact_count < 2:
            evidence.append(f"Only {contact_count} gripper contacts were detected.")
            variants.append("rotate_object_for_clearer_grasp")
            hints["gripper_width_m_delta"] = 0.01

        if slip_velocity > 0.04:
            evidence.append(f"Object slip velocity was {slip_velocity:.3f}m/s.")
            variants.append("increase_grasp_force")
            hints["grasp_force_delta"] = 0.1

        if handle_occluded:
            evidence.append("The target handle appears occluded in the scene state.")
            variants.append("add_handle_occlusion_practice")
            hints["wrist_yaw_deg_delta"] = 15.0

        if not evidence:
            evidence.append("Physics metrics did not identify a clear mechanical fault.")
            variants.append("change_camera_angle")

        return Critique(
            episode_id=episode.episode_id,
            critic=CriticName.PHYSICS,
            root_cause=evidence[0],
            evidence=evidence,
            suggested_variants=variants,
            policy_hints=hints,
            confidence=0.9 if len(evidence) > 1 else 0.55,
            raw={"metrics": metrics},
        )
