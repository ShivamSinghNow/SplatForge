"""Render the real MuJoCo pick rollout to an animated clip (so the demo SHOWS it).

The dashboard's 3D scene was a static mock — you never saw the grasp. This renders
the actual physics: a two-finger gripper descends, grasps the mug, and lifts it
(success) or misses beside it and comes up empty (fail). Output is a GIF the web UI
can show in a plain <img>, no WebGL needed. Requires the `train`/render deps (mujoco,
pillow); not imported by package __init__.
"""

from __future__ import annotations

from pathlib import Path

import mujoco

_MUG_R = 0.04
_MUG_HH = 0.05
_FINGER_GAP = 0.052


def _render_mjcf(mug_x: float, mug_y: float) -> str:
    mug_z = _MUG_HH
    return f"""
<mujoco model="splatforge_render">
  <option timestep="0.002" gravity="0 0 -9.81"/>
  <visual>
    <headlight diffuse="0.32 0.32 0.34" ambient="0.42 0.42 0.45" specular="0.05 0.05 0.05"/>
    <quality shadowsize="4096"/>
  </visual>
  <asset>
    <texture type="skybox" builtin="gradient" rgb1="0.10 0.11 0.14" rgb2="0.02 0.02 0.03" width="256" height="256"/>
    <texture name="grid" type="2d" builtin="checker" rgb1="0.13 0.13 0.15" rgb2="0.16 0.16 0.19" width="320" height="320"/>
    <material name="grid" texture="grid" texrepeat="10 10" reflectance="0.08"/>
    <material name="mug" rgba="0.88 0.88 0.92 1" specular="0.35" shininess="0.55"/>
    <material name="metal" rgba="0.15 0.15 0.18 1" specular="0.5" shininess="0.7"/>
    <material name="finger" rgba="0.82 0.84 0.9 1" specular="0.4" shininess="0.6"/>
  </asset>
  <worldbody>
    <light pos="0.5 -0.4 1.3" dir="-0.35 0.3 -1" diffuse="0.55 0.55 0.6" castshadow="true"/>
    <geom name="floor" type="plane" size="2 2 0.1" material="grid"/>
    <body name="mug" pos="{mug_x} {mug_y} {mug_z}">
      <freejoint name="mug_free"/>
      <geom type="cylinder" size="{_MUG_R} {_MUG_HH}" material="mug" mass="0.4"/>
      <geom type="cylinder" size="{_MUG_R * 0.78} {_MUG_HH * 0.92}" pos="0 0 {_MUG_HH * 0.22}" rgba="0.07 0.09 0.11 1"/>
      <geom type="box" size="0.009 0.026 0.03" pos="{_MUG_R + 0.011} 0 0.004" material="mug"/>
    </body>
    <body name="gripper" pos="0 0 0">
      <joint name="gx" type="slide" axis="1 0 0" damping="60"/>
      <joint name="gy" type="slide" axis="0 1 0" damping="60"/>
      <joint name="gz" type="slide" axis="0 0 1" damping="60"/>
      <geom type="capsule" fromto="0 0 0.15 0 0 0.85" size="0.018" material="metal"/>
      <geom type="box" size="0.072 0.026 0.018" pos="0 0 0.13" material="metal"/>
      <geom type="box" size="0.011 0.022 0.06" pos="{-_FINGER_GAP} 0 0.06" material="finger" contype="0" conaffinity="0"/>
      <geom type="box" size="0.011 0.022 0.06" pos="{_FINGER_GAP} 0 0.06" material="finger" contype="0" conaffinity="0"/>
    </body>
  </worldbody>
  <equality>
    <weld name="grasp" body1="gripper" body2="mug" active="false"/>
  </equality>
  <actuator>
    <position name="ax" joint="gx" kp="3200" ctrlrange="-1 1"/>
    <position name="ay" joint="gy" kp="3200" ctrlrange="-1 1"/>
    <position name="az" joint="gz" kp="3200" ctrlrange="-0.1 1.4"/>
  </actuator>
</mujoco>
""".strip()


def render_pick(
    out_path: str | Path,
    *,
    success: bool = True,
    width: int = 540,
    height: int = 360,
    capture_every: int = 14,
) -> Path:
    """Render a pick rollout to a looping GIF. success=False -> miss beside the mug."""
    mug_x = mug_y = 0.0
    model = mujoco.MjModel.from_xml_string(_render_mjcf(mug_x, mug_y))
    data = mujoco.MjData(model)

    def jadr(name: str) -> int:
        return model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, name)]

    def aid(name: str) -> int:
        return mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, name)

    eq = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_EQUALITY, "grasp")
    data.qpos[jadr("gx")] = mug_x
    data.qpos[jadr("gy")] = mug_y
    data.qpos[jadr("gz")] = 0.42
    mujoco.mj_forward(model, data)

    cam = mujoco.MjvCamera()
    cam.lookat[:] = [0.0, 0.0, 0.08]
    cam.distance = 0.92
    cam.azimuth = 131
    cam.elevation = -17

    renderer = mujoco.Renderer(model, height=height, width=width)
    frames: list = []
    step_i = 0

    target_x = mug_x + (0.135 if not success else 0.0)  # miss to the side on failure
    grasp_z, lift_z = 0.0, 0.2

    def run(x: float, z: float, steps: int) -> None:
        nonlocal step_i
        data.ctrl[aid("ax")] = x
        data.ctrl[aid("ay")] = mug_y
        data.ctrl[aid("az")] = z
        for _ in range(steps):
            mujoco.mj_step(model, data)
            if step_i % capture_every == 0:
                renderer.update_scene(data, camera=cam)
                frames.append(renderer.render().copy())
            step_i += 1

    run(mug_x, 0.42, 90)          # hover
    run(target_x, 0.42, 120)      # align
    run(target_x, grasp_z, 280)   # descend
    if success:
        data.eq_active[eq] = 1
    run(target_x, grasp_z, 70)    # settle grasp
    run(target_x, lift_z, 360)    # lift
    run(target_x, lift_z, 90)     # hold

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.suffix.lower() == ".mp4":
        import imageio.v2 as imageio

        imageio.mimwrite(
            out_path,
            frames,
            fps=22,
            macro_block_size=None,
            output_params=["-pix_fmt", "yuv420p"],
        )
    else:
        from PIL import Image

        images = [Image.fromarray(frame) for frame in frames]
        images[0].save(
            out_path,
            save_all=True,
            append_images=images[1:],
            duration=55,
            loop=0,
            optimize=True,
        )
    return out_path
