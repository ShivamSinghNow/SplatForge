"""MuJoCo physics backend — the ground-truth success signal (SPL-7 / A1).

A Gaussian splat can't tell you whether a grasp succeeded; it has no contact
dynamics. So the robot physically acts here, in MuJoCo, and success is measured
the way CONTRACTS.md §1 defines it: the mug's center of mass lifted at least
`task.lift_threshold_m` above its rest height. That boolean is the y-axis of the
whole self-improvement curve.

The scene is intentionally minimal collision primitives (a table plane + a mug
cylinder) positioned to roughly match the splat scene. A scripted pick drives a
kinematic gripper to the mug; if it gets within grasp radius it welds to the mug
and lifts. A bad policy (offset beyond grasp radius) misses, the mug stays put,
and the rollout is a real failure — which is exactly what makes the signal
trainable for A3/A5/A6 downstream.
"""

from __future__ import annotations

import importlib.util
import math
import os

from splatforge.models import (
    AttemptStatus,
    Episode,
    Observation,
    PolicyVersion,
    SceneSpec,
    TaskSpec,
)
from splatforge.sim import propose_action
from splatforge.simulation.base import SimulationBackend

DEFAULT_LIFT_THRESHOLD_M = float(os.getenv("LIFT_THRESHOLD_M", "0.10"))

# Geometry of the mug primitive (meters).
_MUG_RADIUS = 0.04
_MUG_HALF_HEIGHT = 0.05
# Horizontal distance within which the scripted gripper "catches" the mug.
_GRASP_RADIUS = 0.045
# How high the gripper raises after grasping.
_LIFT_TRAVEL_M = 0.30


def _build_mjcf(mug_x: float, mug_y: float) -> str:
    mug_z = _MUG_HALF_HEIGHT  # rest on the table plane (z = 0)
    return f"""
<mujoco model="splatforge_pick">
  <option timestep="0.002" gravity="0 0 -9.81"/>
  <worldbody>
    <light pos="0 0 1.5" dir="0 0 -1"/>
    <geom name="table" type="plane" size="1 1 0.1" rgba="0.8 0.8 0.82 1"/>
    <body name="mug" pos="{mug_x} {mug_y} {mug_z}">
      <freejoint name="mug_free"/>
      <geom name="mug_geom" type="cylinder" size="{_MUG_RADIUS} {_MUG_HALF_HEIGHT}"
            rgba="0.2 0.5 0.9 1" mass="0.4" contype="1" conaffinity="1"/>
    </body>
    <body name="gripper" pos="0 0 0">
      <joint name="gx" type="slide" axis="1 0 0" damping="60"/>
      <joint name="gy" type="slide" axis="0 1 0" damping="60"/>
      <joint name="gz" type="slide" axis="0 0 1" damping="60"/>
      <geom name="palm" type="box" size="0.02 0.02 0.02" rgba="0.9 0.3 0.3 1"
            contype="0" conaffinity="0" mass="0.5"/>
    </body>
  </worldbody>
  <equality>
    <weld name="grasp" body1="gripper" body2="mug" active="false"/>
  </equality>
  <actuator>
    <position name="ax" joint="gx" kp="3000" ctrlrange="-1 1"/>
    <position name="ay" joint="gy" kp="3000" ctrlrange="-1 1"/>
    <position name="az" joint="gz" kp="3000" ctrlrange="-0.05 1"/>
  </actuator>
</mujoco>
""".strip()


class MujocoSimulationBackend(SimulationBackend):
    name = "mujoco"
    display_name = "MuJoCo physics backend"
    description = (
        "CPU physics backend (runs on laptops, incl. Apple Silicon). "
        "Success = mug lifted past the contract threshold."
    )

    def is_available(self) -> bool:
        return importlib.util.find_spec("mujoco") is not None

    def status_message(self) -> str:
        if self.is_available():
            return "Ready (CPU physics, no GPU required)."
        return "Not installed. Run: pip install mujoco"

    def run_episode(
        self,
        scene: SceneSpec,
        task: TaskSpec,
        policy: PolicyVersion,
        variant_of: str | None = None,
        forced_failure: bool = False,
    ) -> Episode:
        if not self.is_available():
            raise RuntimeError(
                "MuJoCo is not installed. Install it with `pip install mujoco`."
            )

        import mujoco

        action = propose_action(task, policy.parameters)
        params = action.parameters
        offset_x = float(params.get("pregrasp_offset_x_m", 0.0))
        offset_y = float(params.get("pregrasp_offset_y_m", 0.0))
        approach_height = float(params.get("approach_height_m", 0.30))
        lift_threshold = float(getattr(task, "lift_threshold_m", DEFAULT_LIFT_THRESHOLD_M))
        # Grasp tolerance scales with how wide the gripper opens: a better-trained
        # policy that opens wider catches more off-center mugs (default 0.06 -> 0.045,
        # matching the A1 fixed radius).
        gripper_width = float(params.get("gripper_width_m", 0.06))
        grasp_radius = max(0.02, gripper_width * 0.75)

        # Mug placement in the sim, matched to the splat scene when provided.
        mug_x, mug_y = _scene_mug_xy(scene)

        model = mujoco.MjModel.from_xml_string(_build_mjcf(mug_x, mug_y))
        data = mujoco.MjData(model)

        ax = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "ax")
        ay = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "ay")
        az = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "az")
        eq_grasp = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_EQUALITY, "grasp")
        act_ids = (ax, ay, az)

        # Start the gripper above the mug so it doesn't begin inside the table.
        _set_joint(model, data, "gx", mug_x)
        _set_joint(model, data, "gy", mug_y)
        _set_joint(model, data, "gz", approach_height)
        mujoco.mj_forward(model, data)

        mug_rest_z = float(data.body("mug").xpos[2])

        # Where the policy aims: an explicit absolute target (the harness uses this to
        # model imperfect perception) if provided, else track the mug with an offset.
        target_override_x = policy.parameters.get("grasp_target_x_m")
        target_override_y = policy.parameters.get("grasp_target_y_m")
        if target_override_x is not None and target_override_y is not None:
            target_x = float(target_override_x)
            target_y = float(target_override_y)
        else:
            target_x = mug_x + offset_x
            target_y = mug_y + offset_y
        grasp_z = _MUG_HALF_HEIGHT  # palm at mug mid-height

        if forced_failure:
            # Explicit miss for generating a known-bad rollout.
            target_x = mug_x + grasp_radius + 0.05
            target_y = mug_y

        # 1. settle, 2. align over target, 3. descend to mug
        _move(mujoco, model, data, (mug_x, mug_y, approach_height), 150, act_ids)
        _move(mujoco, model, data, (target_x, target_y, approach_height), 200, act_ids)
        _move(mujoco, model, data, (target_x, target_y, grasp_z), 300, act_ids)

        # 4. grasp: weld only if the gripper is actually over the mug
        gripper_xy = data.body("gripper").xpos
        mug_xy = data.body("mug").xpos
        grasp_dist = math.hypot(gripper_xy[0] - mug_xy[0], gripper_xy[1] - mug_xy[1])
        grasped = grasp_dist <= grasp_radius
        if grasped:
            data.eq_active[eq_grasp] = 1
        _move(mujoco, model, data, (target_x, target_y, grasp_z), 100, act_ids)

        # 5. lift
        _move(mujoco, model, data, (target_x, target_y, grasp_z + _LIFT_TRAVEL_M), 400, act_ids)

        mug_lift = float(data.body("mug").xpos[2]) - mug_rest_z
        success = mug_lift >= lift_threshold
        status = AttemptStatus.SUCCESS if success else AttemptStatus.FAILURE

        observation = Observation(
            robot_state={"adapter": self.name, "grasped": grasped},
            scene_state={"scene": scene.scene_id, "object": task.object_name, "goal": task.goal},
            physics_metrics={
                "mug_lift_m": round(mug_lift, 4),
                "lift_threshold_m": lift_threshold,
                "grasp_distance_m": round(grasp_dist, 4),
                "grasp_radius_m": round(grasp_radius, 4),
                "grasped": grasped,
                "success": success,
            },
        )

        return Episode(
            scene_id=scene.scene_id,
            task=task,
            robot_adapter=self.name,
            policy_version=policy.policy_version,
            status=status,
            observation=observation,
            action=action,
            variant_of=variant_of,
        )


def _scene_mug_xy(scene: SceneSpec) -> tuple[float, float]:
    xy = scene.metadata.get("mug_xy")
    if isinstance(xy, (list, tuple)) and len(xy) == 2:
        return float(xy[0]), float(xy[1])
    return 0.0, 0.0


def _set_joint(model, data, joint_name: str, value: float) -> None:
    import mujoco

    jid = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
    adr = model.jnt_qposadr[jid]
    data.qpos[adr] = value
    data.ctrl[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "a" + joint_name[1])] = value


def _move(mujoco, model, data, ctrl_xyz, steps: int, act_ids) -> None:
    data.ctrl[act_ids[0]] = ctrl_xyz[0]
    data.ctrl[act_ids[1]] = ctrl_xyz[1]
    data.ctrl[act_ids[2]] = ctrl_xyz[2]
    for _ in range(steps):
        mujoco.mj_step(model, data)
