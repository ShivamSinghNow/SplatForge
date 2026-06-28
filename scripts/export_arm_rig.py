"""Export the MuJoCo arm rig + grasp trajectory to JSON for the splat viewer.

The web splat viewer rebuilds this arm in three.js and plays the trajectory, so
the *same* physics-driven arm that appears in the MuJoCo rollout also moves
through the reconstructed Gaussian splat. We export the reach->grasp motion
(no lift -- the splatted can is static), and the web side ping-pongs it.

    python scripts/export_arm_rig.py          # -> web/public/rigs/arm_can.json

Each geom is exported with its shape + color; each frame stores every geom's
world pose (position + xyzw quaternion). A placement transform (set per-scene in
scenes.json) maps this MuJoCo-frame rig into the splat's coordinate frame.
"""

from __future__ import annotations

import json
from pathlib import Path

import mujoco
import numpy as np

from splatforge.sim import render_rollout as R

_TYPE = {
    mujoco.mjtGeom.mjGEOM_SPHERE: "sphere",
    mujoco.mjtGeom.mjGEOM_CAPSULE: "capsule",
    mujoco.mjtGeom.mjGEOM_CYLINDER: "cylinder",
    mujoco.mjtGeom.mjGEOM_BOX: "box",
}

# Bodies whose geoms make up the visible arm (skip the can / table / scenery).
_ARM_BODIES = ["pedestal", "yaw_link", "upper_arm", "fore_arm", "wrist"]

OUT_PATH = Path("web/public/rigs/arm_can.json")
CAPTURE_EVERY = 4


def main() -> int:
    model = mujoco.MjModel.from_xml_string(R._scene_mjcf())
    data = mujoco.MjData(model)

    def jqadr(name: str) -> int:
        return model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, name)]

    def jdadr(name: str) -> int:
        return model.jnt_dofadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, name)]

    def aid(name: str) -> int:
        return mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, name)

    grip = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, "grip")
    qadr = [jqadr("j_yaw"), jqadr("j_shoulder"), jqadr("j_elbow")]
    dadr = [jdadr("j_yaw"), jdadr("j_shoulder"), jdadr("j_elbow")]
    wq = jqadr("j_wrist")

    arm_body_ids = {mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY, b) for b in _ARM_BODIES}
    arm_geoms = [g for g in range(model.ngeom) if model.geom_bodyid[g] in arm_body_ids]

    # --- rig definition (shape + color per geom) ---
    rig = []
    for g in arm_geoms:
        matid = model.geom_matid[g]
        rgba = list(model.mat_rgba[matid]) if matid >= 0 else list(model.geom_rgba[g])
        rig.append(
            {
                "type": _TYPE[int(model.geom_type[g])],
                "size": [round(float(x), 5) for x in model.geom_size[g]],
                "color": [round(float(c), 3) for c in rgba[:3]],
                "opacity": round(float(rgba[3]), 3),
            }
        )

    # --- motion: reach -> grasp (no lift; the splatted can can't move) ---
    cx, cy = R.CAN_POS
    home_t = np.array([cx - 0.18, cy + 0.12, R.CAN_Z + 0.30])
    above_t = np.array([cx, cy, R.CAN_Z + 0.22])
    grasp_t = np.array([cx, cy, R.CAN_Z - 0.01])

    scratch = mujoco.MjData(model)
    scratch.qpos[qadr[0]], scratch.qpos[qadr[1]], scratch.qpos[qadr[2]] = -0.5, 1.6, 1.2

    def ik_to(target, iters=120):
        return R._ik(model, scratch, grip, target, qadr, dadr, wq, iters=iters)

    q_home = ik_to(home_t, iters=400)
    for a, v in zip(qadr, q_home):
        data.qpos[a] = v
    data.qpos[wq] = -(q_home[1] + q_home[2])
    mujoco.mj_forward(model, data)

    frames: list = []

    def capture() -> None:
        frame = []
        for g in arm_geoms:
            p = data.geom_xpos[g]
            q = np.zeros(4)
            mujoco.mju_mat2Quat(q, data.geom_xmat[g])  # q = [w, x, y, z]
            frame.append(
                [
                    round(float(p[0]), 5),
                    round(float(p[1]), 5),
                    round(float(p[2]), 5),
                    round(float(q[1]), 5),
                    round(float(q[2]), 5),
                    round(float(q[3]), 5),
                    round(float(q[0]), 5),
                ]
            )
        frames.append(frame)

    def set_ctrl(q3) -> None:
        data.ctrl[aid("a_yaw")] = q3[0]
        data.ctrl[aid("a_shoulder")] = q3[1]
        data.ctrl[aid("a_elbow")] = q3[2]
        data.ctrl[aid("a_wrist")] = -(q3[1] + q3[2])

    step_i = 0

    def move(p0, p1, steps) -> None:
        nonlocal step_i
        p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
        for i in range(steps):
            target = p0 + (p1 - p0) * ((i + 1) / steps)
            set_ctrl(ik_to(target, iters=40))
            mujoco.mj_step(model, data)
            if step_i % CAPTURE_EVERY == 0:
                capture()
            step_i += 1

    capture()  # initial home frame
    move(home_t, above_t, 90)
    move(above_t, grasp_t, 130)
    for _ in range(20):  # short dwell at the grasp
        mujoco.mj_step(model, data)
        if step_i % CAPTURE_EVERY == 0:
            capture()
        step_i += 1

    out = {
        "meta": {
            "fps": 30,
            "frameCount": len(frames),
            "canPos": [round(cx, 5), round(cy, 5), round(R.CAN_Z, 5)],
            "tableH": R.TABLE_H,
            "note": "MuJoCo frame, Z-up, meters. Geom poses are world-space.",
        },
        "geoms": rig,
        "frames": frames,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out))
    kb = OUT_PATH.stat().st_size / 1024
    print(f"wrote {OUT_PATH}  ({len(rig)} geoms, {len(frames)} frames, {kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
