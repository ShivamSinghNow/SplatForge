# SplatForge

SplatForge helps a robot improve by practicing inside a training world built from a
real tabletop scan. A scan becomes a Gaussian Splat scene, the robot attempts a
task, critics explain failures, SplatForge generates harder variants, and the
system retests after a small policy/adapter update.

The current build is a local web dashboard backed by FastAPI. It uses a safe
dry-run simulation backend first, local JSONL logging by default, and optional
partner integrations for MongoDB Atlas, Gemini, and future NVIDIA Isaac Sim.

## Getting Started

```bash
git clone https://github.com/ShivamSinghNow/SplatForge.git
cd SplatForge

python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
```

Start the local API:

```bash
uvicorn splatforge.api.app:app --reload
```

Start the local dashboard in another terminal:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`, choose a scene/task/backend, and click **Run
Simulation**. The page shows the failure, critic explanation, generated variants,
policy update, and retest result without dumping raw JSON in the terminal.

You can still run a concise CLI simulation summary:

```bash
splatforge sim run --scene mug_table --task pick_mug --backend dry-run
```

The dry-run loop intentionally fails the first mug pick attempt, runs physics and
optional Gemini critique, generates practice variants, updates grasp parameters,
and retests the original task successfully.

Print locally logged episodes:

```bash
splatforge report --collection episodes
```

## Architecture

```text
real scan -> Gaussian Splat scene -> simulation attempt -> critic council
          -> practice variants -> policy adapter update -> retest
```

Key modules:

- `src/splatforge/api/` exposes the local FastAPI dashboard API.
- `src/splatforge/orchestrator/` runs the closed loop.
- `src/splatforge/simulation/` separates dry-run development from future Isaac GPU simulation.
- `src/splatforge/robot/` defines safe robot adapters used by the dry-run backend.
- `src/splatforge/critics/` contains physics and optional Gemini critics.
- `src/splatforge/variants/` turns failure reports into practice scenes.
- `src/splatforge/policy/` updates grasp parameters from critic hints.
- `src/splatforge/storage/` writes local JSONL logs or MongoDB documents.
- `web/` contains the React local dashboard.
- `demo/scenes/` contains the first tabletop scene config.

## Partner Resources

You do not need partner credentials for the dry-run scaffold.

Claim or configure these when you reach the matching step:

- **MongoDB Atlas:** needed when you want cloud episode logging instead of local
  `runs/*.jsonl`. Set `MONGODB_URI` and `MONGODB_DATABASE`.
- **Google Gemini:** needed when you want the multimodal critic council member.
  Set `GEMINI_API_KEY`.
- **MiniMax:** useful after Gemini plus physics works, as a second critic or
  creative variant generator.
- **Digital Ocean:** useful when deploying the CLI/API/dashboard for judges or
  teammates, and especially when you need an NVIDIA GPU instance for Isaac Sim.
- **LiveKit:** useful only if adding voice, video, teleoperation, or a narrated
  physical AI agent interface.
- **Modular/Mojo/MAX:** useful later for local Gemma serving or optimized
  inference, not required for the MVP loop.

## Local Data

Runtime logs are written to `runs/` when MongoDB is not configured. Generated
Gaussian Splat, ChromaDB, and simulation artifacts should stay out of git unless
they are intentionally small demo fixtures.

## NVIDIA Isaac Backend

The dashboard already lists an `isaac` backend scaffold. It is not wired to real
Isaac Sim yet. See `docs/nvidia_isaac.md` for the GPU setup path and environment
variables.

## Fact Gates

The API exposes `GET /facts` to keep demo placeholders separate from verified
runtime facts. The current gates verify that the tabletop scene points at an
existing non-placeholder `.splat` export and that a DigitalOcean H100 droplet is
identified with `DIGITALOCEAN_H100_DROPLET_ID` plus `DIGITALOCEAN_GPU_TYPE=H100`.
See `docs/f2_gating_facts.md` for the first H100/splat verification runbook and
current gate status.

## License

TBD
