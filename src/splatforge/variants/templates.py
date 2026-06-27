VARIANT_TEMPLATES: dict[str, dict[str, float | int | bool | str]] = {
    "lower_approach_height": {"approach_height_m_delta": -0.04},
    "rotate_object_for_clearer_grasp": {"object_yaw_deg": 30.0},
    "add_handle_occlusion_practice": {"occluder_enabled": True, "occluder_offset_x_m": 0.04},
    "increase_grasp_force": {"grasp_force_delta": 0.1},
    "change_camera_angle": {"camera_yaw_deg": 20.0},
}
