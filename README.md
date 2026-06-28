# SplatForge

**A self-improving robot policy that trains itself in worlds it reconstructs.**

A robot manipulation agent scans a real scene into a 3D Gaussian Splat, generates its own
task variations, runs rollouts in physics, evaluates them with a vision-language critic,
and folds its successes back into a LoRA fine-tune — getting measurably better at a task
with **zero new human labels**.

> 🏗️ Built for the **AI Engineer World's Fair Hackathon 2026** (Cerebral Valley · Shack15,
> San Francisco · Jun 27–28). Status: in active development.

---

## What it does

Point a phone at a tabletop, and SplatForge turns it into a photorealistic, renderable
digital twin. Drop a robot in, give it a task ("pick up the mug"), and it teaches itself
to do it better — proposing its own edge cases, attempting them, grading itself, and
retraining on what worked. Over a run, its success rate climbs on a live curve.

This targets the hackathon's **recursive self-improvement** themes:
- **Continual learning** (primary) — gets better the more it runs, with minimal human input.
- **Recursive intelligence** (secondary) — generates its own training data and updates its own weights.
- **Self-improvement stack** — the autonomous VLM critic is a self-evaluation framework.

## The self-improvement loop

1. **Reconstruct** — a short phone/webcam video of a real scene becomes a 3D Gaussian
   Splat: a photoreal, viewpoint-controllable digital twin.
2. **Imagine variations** — an LLM curriculum generator proposes task variations and edge
   cases (object rotated, occluded by a bowl, dimmer lighting) as structured scene specs.
3. **Act** — the manipulation policy runs each scenario in a physics simulator.
4. **Self-evaluate** — a vision-language critic scores each rollout (success/failure +
   reasoning + difficulty), with no human in the loop.
5. **Distill** — successful trajectories are folded into a LoRA/adapter fine-tune of the
   policy. Failures become the next round's targeted curriculum.
6. **Repeat** — the loop runs autonomously; a live success-rate curve climbs.

## How the splat and the physics fit together (key design point)

A Gaussian splat is a **renderer**, not a physics engine — it has no collision or contact
dynamics, so it can't tell you whether a grasp succeeded. So the two halves split the work:

- **Gaussian splat = the eyes and the skin.** The photoreal fly-through, the rendered
  views the critic scores, and (optionally) textured backgrounds for domain randomization.
- **MuJoCo = the body and the physics.** Where the robot actually acts, and where grasp
  success is measured (object lifted past a height threshold). This is the curve's y-axis.

The robot *physically acts* in MuJoCo and is *shown* in the splat. The MuJoCo scene uses
simple collision primitives (a table plane, a cylinder for the mug) positioned to match the
splat, so the camera tells one coherent story: "it learns inside the scene it reconstructed."

## Architecture

| Component | Choice |
|---|---|
| Scene reconstruction | 3D Gaussian Splatting (gsplat / Nerfstudio); pre-captured splat to keep reconstruction off the critical path |
| Physics + success signal | **MuJoCo** (CPU, runs on laptops incl. Apple Silicon) |
| Policy | Small manipulation policy first; **NVIDIA GR00T as a sequential upgrade** (compute blocker removed by H100 access — see Compute) |
| Curriculum generator | LLM (Gemini Flash) → structured JSON scene-variation specs |
| Self-critic | VLM (Gemini) → pass/fail + rationale + difficulty tag |
| Replay buffer | **MongoDB Atlas + Voyage AI** — trajectory store with vector search over failure embeddings to pick the next curriculum |
| Fine-tune | PyTorch + LoRA/PEFT adapters, between loop iterations, on DigitalOcean **H100** GPU droplets |
| Orchestrator | Loop controller (scan → imagine → act → evaluate → distill) + live dashboard |
| Frontend | Web dashboard: splat viewer + live success-rate chart + run controls |

### Compute allocation
- **Physics / rollouts** → MuJoCo on CPU (no GPU needed; runs on the team's laptops).
- **LoRA fine-tune** (and GR00T inference, if reached) → **DigitalOcean H100 GPU droplets**
  (~$200 of credit available). The GPU is a *training* resource, not a simulation resource.
- The H100 headroom lets us train adapters fast and run many real loop iterations overnight,
  for a richer, more convincing success curve — and it removes the compute blocker on GR00T.
- Ops: spin the droplet up early and prove one end-to-end adapter train before depending on
  it; shut it down between runs so idle time doesn't burn credit.

### Why not Isaac Sim?
Isaac Sim's main advantage is photoreal rendering — but the splat already owns the visuals.
Isaac Sim also requires a dedicated NVIDIA RTX GPU and only runs on Linux/Windows (not
macOS), and its install can cost 4–8 hours. MuJoCo gives us contact physics and a fast
headless success signal in minutes, on the hardware we already have.

## Demo (~3 minutes)

1. Show the captured scan; fly the camera through the splat — "a real scene, fully renderable."
2. The policy attempts "pick up the mug" and fails on a tricky variation.
3. Run the self-improvement loop — the real overnight run is replayed, labeled as such, so
   the climbing curve is genuine without grinding a GPU on stage.
4. Curriculum spawns variations; the ground-truth success curve climbs ~40% → ~85% across
   several real checkpoints, with critic reasoning alongside.
5. A final clean grasp on the originally-failed case.
6. Close: *"No new human labels — it wrote its own training data from a scene it
   reconstructed itself."*

## Original contributions vs. dependencies

Per hackathon rules, the work built during the event is clearly separable from
off-the-shelf dependencies:

- **Dependencies (not ours):** the Gaussian splat renderer, the foundation policy (GR00T),
  base LLM/VLM models.
- **Our original contributions:** the loop orchestration, the curriculum generator, the
  self-critic evaluation harness, the fine-tune loop, and the dashboard that ties it together.

## Partner integrations

Google Gemini (curriculum generator + visual critic) · MiniMax (second independent LLM
critic in the council) · NVIDIA Isaac GR00T N1.7 + Hugging Face (robot foundation model
inference) · DigitalOcean (GPU droplets for GR00T + the fine-tune loop) · MongoDB Atlas +
Voyage AI + Chroma (replay buffer + failure vector search) · Polycam (phone Gaussian-splat
capture).

## Status & roadmap

- [ ] MuJoCo rollout emits a real `success: true/false` (the success signal)
- [ ] Splat viewer + camera fly-through in the dashboard
- [ ] Curriculum generator (LLM → JSON scene specs)
- [ ] VLM self-critic scoring rollouts
- [ ] Replay buffer in MongoDB Atlas + Voyage vector search
- [ ] LoRA fine-tune loop producing real checkpoints + climbing curve
- [ ] Dashboard success-rate chart + run controls
- [ ] GR00T swapped in as the policy (reachable upgrade — H100 removes the compute blocker)
- [ ] 1-minute demo video

## Team

Shivam Singh ([@ShivamSinghNow](https://github.com/ShivamSinghNow)) ·
Jay Trivedi ([@jaytrivediSF25](https://github.com/jaytrivediSF25))

## Getting started

> Setup instructions will land as the components come together. Planned stack: Python +
> PyTorch + MuJoCo + gsplat, with a lightweight web dashboard.

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
- **MiniMax:** the second independent LLM critic in the council (real MiniMax
  chat API). Set `MINIMAX_API_KEY`.
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
