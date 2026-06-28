"""Render the real MuJoCo pick rollout to a clip (so the demo SHOWS the grasp).

The scene mirrors the scanned splat: a round coffee table holding a soda can, a
notebook, and a pen, with a small articulated arm bolted to the tabletop. The
arm reaches over and grasps the *requested* object using real inverse kinematics
(damped least-squares), welds on contact, and lifts it. Which object is grasped
is selectable (can / pen / notebook), so the dashboard's text field ("pick up
the pen") drives a different, real rollout per object.

The end-effector follows a Cartesian path (over -> straight down -> straight up)
solved per simulation step, so the gripper never dips through the table the way a
raw joint-space move would, and an elbow-up posture keeps the arm links clear.

Requires the render deps (mujoco, numpy, imageio/pillow); not imported by the
package __init__.
"""

from __future__ import annotations

from pathlib import Path

import mujoco
import numpy as np

# --- Scene geometry (meters) --------------------------------------------------
TABLE_H = 0.40  # tabletop surface height
TABLE_R = 0.42  # round tabletop radius
TABLE_HZ = 0.018  # tabletop half-thickness

CAN_R, CAN_HH = 0.033, 0.06
CAN_POS = (0.06, 0.03)
CAN_Z = TABLE_H + CAN_HH
NOTEBOOK_POS = (-0.04, -0.08)  # within comfortable arm reach so it lifts cleanly
PEN_POS = (0.17, -0.10)

# Grasp parameters per selectable object: (x, y) on the table, the fingertip
# height to grasp at, and the height to lift the gripper to.
_OBJECTS = {
    "can": {"pos": CAN_POS, "grasp_z": CAN_Z - 0.01, "lift_z": CAN_Z + 0.24, "label": "the can"},
    "pen": {"pos": PEN_POS, "grasp_z": TABLE_H + 0.02, "lift_z": TABLE_H + 0.24, "label": "the pen"},
    # Notebook is a chunky book so it reads clearly when lifted (no wrist tilt --
    # tilting a welded flat object stresses the constraint until it flings off).
    "notebook": {
        "pos": NOTEBOOK_POS,
        "grasp_z": TABLE_H + 0.035,
        "lift_z": TABLE_H + 0.26,
        "present_tilt": 1.2,  # rotate it up toward vertical -> held on its edge
        "label": "the notebook",
    },
}

BASE_X, BASE_Y = -0.34, 0.18
PEDESTAL_H = 0.12
SHOULDER_Z = TABLE_H + PEDESTAL_H
L1, L2 = 0.28, 0.26
GRIP_DROP = 0.075


def _coll(is_target: bool) -> str:
    # The grasp target is collidable (rests on the table, can be lifted); the
    # other objects are static scenery (no collision, never move).
    return 'contype="1" conaffinity="1"' if is_target else 'contype="0" conaffinity="0"'


def _scene_mjcf(target: str = "can", clutter: bool = False) -> str:
    cx, cy = CAN_POS
    nx, ny = NOTEBOOK_POS
    px, py = PEN_POS
    can_j = '<freejoint name="can_free"/>' if target == "can" else ""
    nb_j = '<freejoint name="nb_free"/>' if target == "notebook" else ""
    pen_j = '<freejoint name="pen_free"/>' if target == "pen" else ""
    can_c, nb_c, pen_c = _coll(target == "can"), _coll(target == "notebook"), _coll(target == "pen")

    clutter_xml = (
        f"""
    <body name="bowl" pos="-0.19 0.14 {TABLE_H + 0.03}">
      <geom type="cylinder" size="0.062 0.03" material="bowl" contype="0" conaffinity="0"/>
      <geom type="cylinder" size="0.05 0.024" pos="0 0 0.012" material="bowlinner" contype="0" conaffinity="0"/>
    </body>
    <body name="block" pos="0.21 0.16 {TABLE_H + 0.032}" euler="0 0 0.5">
      <geom type="box" size="0.032 0.032 0.032" material="block" contype="0" conaffinity="0"/>
    </body>"""
        if clutter
        else ""
    )
    return f"""
<mujoco model="splatforge_tabletop">
  <compiler angle="radian" autolimits="true"/>
  <option timestep="0.002" gravity="0 0 -9.81"/>
  <visual>
    <headlight diffuse="0.4 0.4 0.42" ambient="0.45 0.45 0.48" specular="0.08 0.08 0.08"/>
    <quality shadowsize="4096"/>
    <map znear="0.01" zfar="30"/>
  </visual>
  <asset>
    <texture type="skybox" builtin="gradient" rgb1="0.12 0.13 0.17" rgb2="0.02 0.02 0.03" width="256" height="256"/>
    <texture name="grid" type="2d" builtin="checker" rgb1="0.11 0.11 0.13" rgb2="0.14 0.14 0.16" width="320" height="320"/>
    <material name="floor" texture="grid" texrepeat="8 8" reflectance="0.05"/>
    <material name="wood" rgba="0.45 0.29 0.17 1" specular="0.3" shininess="0.45"/>
    <material name="woodleg" rgba="0.32 0.20 0.12 1" specular="0.2" shininess="0.3"/>
    <material name="can" rgba="0.83 0.11 0.12 1" specular="0.6" shininess="0.75"/>
    <material name="metal" rgba="0.66 0.68 0.72 1" specular="0.75" shininess="0.85"/>
    <material name="notecover" rgba="0.16 0.45 0.85 1" specular="0.35" shininess="0.5"/>
    <material name="paper" rgba="0.92 0.91 0.86 1" specular="0.08" shininess="0.15"/>
    <material name="pen" rgba="0.10 0.22 0.55 1" specular="0.5" shininess="0.7"/>
    <material name="pencap" rgba="0.80 0.16 0.16 1" specular="0.5" shininess="0.7"/>
    <material name="bowl" rgba="0.86 0.87 0.91 1" specular="0.55" shininess="0.65"/>
    <material name="bowlinner" rgba="0.17 0.21 0.29 1" specular="0.3" shininess="0.4"/>
    <material name="block" rgba="0.18 0.55 0.55 1" specular="0.4" shininess="0.5"/>
    <material name="arm" rgba="0.20 0.21 0.24 1" specular="0.5" shininess="0.6"/>
    <material name="joint" rgba="0.85 0.55 0.10 1" specular="0.6" shininess="0.7"/>
    <material name="finger" rgba="0.80 0.82 0.88 1" specular="0.45" shininess="0.6"/>
  </asset>

  <worldbody>
    <light pos="0.4 -0.5 1.6" dir="-0.3 0.35 -1" diffuse="0.6 0.6 0.62" castshadow="true"/>
    <geom name="floor" type="plane" size="3 3 0.1" material="floor"/>

    <body name="table" pos="0 0 0">
      <geom name="table_top" type="cylinder" size="{TABLE_R} {TABLE_HZ}"
            pos="0 0 {TABLE_H - TABLE_HZ}" material="wood"/>
      <geom type="cylinder" size="0.045 {(TABLE_H - 0.05) / 2}" pos="0 0 {(TABLE_H - 0.05) / 2 + 0.02}"
            material="woodleg" contype="0" conaffinity="0"/>
      <geom type="cylinder" size="0.17 0.012" pos="0 0 0.012" material="woodleg" contype="0" conaffinity="0"/>
    </body>

    <body name="can" pos="{cx} {cy} {CAN_Z}">
      {can_j}
      <geom type="cylinder" size="{CAN_R} {CAN_HH}" material="can" mass="0.35" {can_c}/>
      <geom type="cylinder" size="{CAN_R * 0.96} 0.004" pos="0 0 {CAN_HH}" material="metal" contype="0" conaffinity="0"/>
      <geom type="cylinder" size="{CAN_R * 0.96} 0.004" pos="0 0 {-CAN_HH}" material="metal" contype="0" conaffinity="0"/>
    </body>

    <body name="notebook" pos="{nx} {ny} {TABLE_H + 0.001}" euler="0 0 0.35">
      {nb_j}
      <geom type="box" size="0.09 0.066 0.016" pos="0 0 0.016" material="notecover" mass="0.12" {nb_c}/>
      <geom type="box" size="0.083 0.059 0.006" pos="0.004 0 0.036" material="paper" contype="0" conaffinity="0"/>
    </body>

    <body name="pen" pos="{px} {py} {TABLE_H + 0.0065}" euler="0 1.5708 -0.55">
      {pen_j}
      <geom type="cylinder" size="0.0062 0.07" material="pen" mass="0.03" {pen_c}/>
      <geom type="cylinder" size="0.0058 0.012" pos="0 0 0.078" material="metal" contype="0" conaffinity="0"/>
      <geom type="cylinder" size="0.0068 0.016" pos="0 0 -0.05" material="pencap" contype="0" conaffinity="0"/>
    </body>
{clutter_xml}
    <body name="pedestal" pos="{BASE_X} {BASE_Y} {TABLE_H}">
      <geom type="cylinder" size="0.05 0.012" material="metal" contype="0" conaffinity="0"/>
      <geom type="cylinder" size="0.032 {PEDESTAL_H / 2}" pos="0 0 {PEDESTAL_H / 2}"
            material="arm" contype="0" conaffinity="0"/>
      <body name="yaw_link" pos="0 0 {PEDESTAL_H}">
        <joint name="j_yaw" type="hinge" axis="0 0 1" damping="6" range="-3.2 3.2"/>
        <geom type="sphere" size="0.034" material="joint" contype="0" conaffinity="0"/>
        <body name="upper_arm" pos="0 0 0">
          <joint name="j_shoulder" type="hinge" axis="0 1 0" damping="6" range="-2.7 2.7"/>
          <geom type="capsule" fromto="0 0 0 0 0 {L1}" size="0.026" material="arm" contype="0" conaffinity="0"/>
          <body name="fore_arm" pos="0 0 {L1}">
            <joint name="j_elbow" type="hinge" axis="0 1 0" damping="5" range="-2.9 2.9"/>
            <geom type="sphere" size="0.029" material="joint" contype="0" conaffinity="0"/>
            <geom type="capsule" fromto="0 0 0 0 0 {L2}" size="0.022" material="arm" contype="0" conaffinity="0"/>
            <body name="wrist" pos="0 0 {L2}">
              <joint name="j_wrist" type="hinge" axis="0 1 0" damping="4" range="-3.2 3.2"/>
              <geom type="sphere" size="0.024" material="joint" contype="0" conaffinity="0"/>
              <geom type="box" size="0.03 0.022 0.014" pos="0 0 -0.016" material="metal" contype="0" conaffinity="0"/>
              <geom type="box" size="0.008 0.02 0.03" pos="-0.026 0 -0.05" material="finger" contype="0" conaffinity="0"/>
              <geom type="box" size="0.008 0.02 0.03" pos="0.026 0 -0.05" material="finger" contype="0" conaffinity="0"/>
              <site name="grip" pos="0 0 {-GRIP_DROP}" size="0.006"/>
            </body>
          </body>
        </body>
      </body>
    </body>
  </worldbody>

  <equality>
    <weld name="grasp" body1="wrist" body2="{target}" active="false"/>
  </equality>

  <actuator>
    <position name="a_yaw" joint="j_yaw" kp="900" ctrlrange="-3.2 3.2"/>
    <position name="a_shoulder" joint="j_shoulder" kp="2200" ctrlrange="-2.7 2.7"/>
    <position name="a_elbow" joint="j_elbow" kp="1600" ctrlrange="-2.9 2.9"/>
    <position name="a_wrist" joint="j_wrist" kp="500" ctrlrange="-3.2 3.2"/>
  </actuator>
</mujoco>
""".strip()


def _ik(model, data, site_id, target, qadr, dadr, wrist_qadr, *, iters=400, tol=8e-4):
    """Damped least-squares IK over [yaw, shoulder, elbow]; wrist slaved level."""
    target = np.asarray(target, dtype=float)
    jacp = np.zeros((3, model.nv))
    jacr = np.zeros((3, model.nv))
    lam = 0.18
    for _ in range(iters):
        data.qpos[wrist_qadr] = -(data.qpos[qadr[1]] + data.qpos[qadr[2]])
        mujoco.mj_forward(model, data)
        err = target - data.site_xpos[site_id]
        if np.linalg.norm(err) < tol:
            break
        mujoco.mj_jacSite(model, data, jacp, jacr, site_id)
        jac = jacp[:, dadr]
        dq = jac.T @ np.linalg.solve(jac @ jac.T + (lam**2) * np.eye(3), err)
        for i, a in enumerate(qadr):
            data.qpos[a] += float(np.clip(dq[i], -0.2, 0.2))
    return [float(data.qpos[a]) for a in qadr]


def _weld_here(model, data, eq, body1, body2) -> None:
    """Activate a weld pinning body2 to body1 at their CURRENT relative pose."""
    dp = data.xpos[body2] - data.xpos[body1]
    mat1 = data.xmat[body1].reshape(3, 3)
    relpos = mat1.T @ dp
    neg_q1 = np.zeros(4)
    q_rel = np.zeros(4)
    mujoco.mju_negQuat(neg_q1, data.xquat[body1])
    mujoco.mju_mulQuat(q_rel, neg_q1, data.xquat[body2])
    model.eq_data[eq][0:3] = 0.0
    model.eq_data[eq][3:6] = relpos
    model.eq_data[eq][6:10] = q_rel
    model.eq_data[eq][10] = 1.0
    data.eq_active[eq] = 1


def render_pick(
    out_path: str | Path,
    *,
    target: str = "can",
    success: bool = True,
    clutter: bool = False,
    width: int = 640,
    height: int = 400,
    capture_every: int = 8,
) -> Path:
    """Render the tabletop arm grasping `target` (can / pen / notebook) to mp4/gif.

    success=False -> the arm reaches beside the object and closes on empty air.
    clutter=True  -> add a bowl + block (the "harder variation" scene).
    """
    if target not in _OBJECTS:
        raise ValueError(f"unknown target '{target}'; choose from {sorted(_OBJECTS)}")
    spec = _OBJECTS[target]
    tx, ty = spec["pos"]
    grasp_z, lift_z = spec["grasp_z"], spec["lift_z"]
    present_tilt = spec.get("present_tilt", 0.0)

    model = mujoco.MjModel.from_xml_string(_scene_mjcf(target, clutter))
    data = mujoco.MjData(model)

    def jqadr(name):
        return model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, name)]

    def jdadr(name):
        return model.jnt_dofadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, name)]

    def aid(name):
        return mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, name)

    grip_site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, "grip")
    eq = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_EQUALITY, "grasp")
    # Heavily damp the grasp weld (default stiffness, high dampratio) so a flat
    # object hangs steady instead of pendulum-swinging -- without destabilizing
    # the solver the way an over-stiff weld does.
    model.eq_solref[eq] = [0.02, 5.0]
    b_wrist = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY, "wrist")
    b_target = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY, target)
    qadr = [jqadr("j_yaw"), jqadr("j_shoulder"), jqadr("j_elbow")]
    dadr = [jdadr("j_yaw"), jdadr("j_shoulder"), jdadr("j_elbow")]
    wrist_qadr = jqadr("j_wrist")

    miss = 0.12 if not success else 0.0
    home_t = np.array([BASE_X + 0.14, BASE_Y, TABLE_H + 0.42])  # raised, near the base
    above_t = np.array([tx + miss, ty, grasp_z + 0.22])
    grasp_t = np.array([tx + miss, ty, grasp_z])
    lift_t = np.array([tx + miss, ty, lift_z])

    # Elbow-up seed so the arm reaches down without sinking links through the top.
    scratch = mujoco.MjData(model)
    scratch.qpos[qadr[0]], scratch.qpos[qadr[1]], scratch.qpos[qadr[2]] = -0.5, 1.6, 1.2

    def ik_to(tgt, iters=120):
        return _ik(model, scratch, grip_site, tgt, qadr, dadr, wrist_qadr, iters=iters)

    q_home = ik_to(home_t, iters=400)
    for a, v in zip(qadr, q_home):
        data.qpos[a] = v
    data.qpos[wrist_qadr] = -(q_home[1] + q_home[2])
    mujoco.mj_forward(model, data)

    cam = mujoco.MjvCamera()
    cam.lookat[:] = [0.0, -0.02, TABLE_H + 0.08]
    cam.distance = 1.5
    cam.azimuth = 124
    cam.elevation = -16

    renderer = mujoco.Renderer(model, height=height, width=width)
    frames: list = []
    step_i = 0

    def set_ctrl(q3, wrist_tilt=0.0):
        data.ctrl[aid("a_yaw")] = q3[0]
        data.ctrl[aid("a_shoulder")] = q3[1]
        data.ctrl[aid("a_elbow")] = q3[2]
        # Level the gripper (point down); +wrist_tilt "presents" a flat object.
        data.ctrl[aid("a_wrist")] = -(q3[1] + q3[2]) + wrist_tilt

    def move(p0, p1, steps, tilt0=0.0, tilt1=0.0):
        nonlocal step_i
        p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
        for i in range(steps):
            f = (i + 1) / steps
            tgt = p0 + (p1 - p0) * f
            set_ctrl(ik_to(tgt, iters=40), tilt0 + (tilt1 - tilt0) * f)
            mujoco.mj_step(model, data)
            if step_i % capture_every == 0:
                renderer.update_scene(data, camera=cam)
                frames.append(renderer.render().copy())
            step_i += 1

    move(home_t, above_t, 90)  # swing over, staying high above the table
    move(above_t, grasp_t, 130)  # straight down onto the object
    if success:
        _weld_here(model, data, eq, b_wrist, b_target)
    move(grasp_t, grasp_t, 45)  # close + settle the grip
    move(grasp_t, lift_t, 150)  # lift straight up, clear of the table
    move(lift_t, lift_t, 75, 0.0, present_tilt)  # rotate to present (e.g. notebook -> sideways)
    move(lift_t, lift_t, 10, present_tilt, present_tilt)  # brief settle, then end (before a flat object slips)

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.suffix.lower() == ".mp4":
        import imageio.v2 as imageio

        imageio.mimwrite(
            out_path,
            frames,
            fps=24,
            macro_block_size=None,
            output_params=["-pix_fmt", "yuv420p"],
        )
    else:
        from PIL import Image

        images = [Image.fromarray(frame) for frame in frames]
        images[0].save(out_path, save_all=True, append_images=images[1:], duration=50, loop=0, optimize=True)
    return out_path
