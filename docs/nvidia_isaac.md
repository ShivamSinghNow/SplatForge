# NVIDIA Isaac Backend

SplatForge is now structured so the local web app can run against multiple
simulation backends. The `dry-run` backend is for local dashboard development.
The `isaac` backend is the planned NVIDIA GPU runtime.

## Runtime Target

Use Isaac Sim / Isaac Lab on a Linux machine with an NVIDIA GPU. A local Mac can
run the FastAPI API and React dashboard, but it should not be treated as the
physics/rendering machine for the final simulator.

Recommended GPU runtime:

- Ubuntu/Linux workstation or Digital Ocean GPU instance
- NVIDIA driver compatible with the Isaac Sim release
- Isaac Sim and/or Isaac Lab installed
- SplatForge repo cloned on the GPU machine
- `.env` configured with one of:
  - `ISAAC_SIM_ROOT=/path/to/isaac-sim`
  - `ISAAC_SIM_PYTHON=/path/to/isaac-sim/python.sh`

## Current Scaffold

The Isaac backend currently reports setup status through the API:

```bash
curl http://localhost:8000/backends
```

If `ISAAC_SIM_ROOT` or `ISAAC_SIM_PYTHON` is not set, the dashboard will show
that Isaac needs setup. Selecting `isaac` before it is wired returns a clear API
error instead of pretending the simulation ran.

## What Gets Wired Next

The Isaac backend should eventually provide:

- load tabletop scene
- load Franka or another robot asset
- load mug/block physics proxy geometry
- attach Gaussian Splat visual asset or rendered camera background
- step pick-and-place policy
- collect contact count, slip velocity, object pose, and goal distance
- export RGB/depth frames and replay video
- return a normal SplatForge `Episode`

## Partner Resource Timing

Use Digital Ocean GPU credits when no local NVIDIA GPU is available. MongoDB and
Gemini are useful after Isaac can produce real episodes, frames, and metrics.
