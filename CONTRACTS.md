# SplatForge — Shared Contracts (F1 / SPL-5)

Single source of truth for the interfaces between the two tracks. Build to these and
the tracks integrate cleanly. **Change a contract only by editing this file and pinging
the other owner** — don't silently diverge.

- **Track A (Shivam):** `sim/`, `loop/` — physics, success signal, orchestrator, LoRA.
- **Track B (Jay):** `brain/`, `storage/`, `dashboard/` — curriculum gen, critic, Atlas, UI.

## 0. Locked decisions
- Storage: **MongoDB Atlas + Voyage AI** (ChromaDB dropped).
- Physics + success signal: **MuJoCo** (CPU). The splat is visuals + the critic's eyes.
- Policy: **small policy first**; GR00T is a stretch (`SPL-14`).
- Fine-tune: **DigitalOcean H100** droplets.

## 1. Demo scene & task  ⚠️ confirm against the real capture
- `task` id: **`pick_up_mug`**
- Objects: a **mug** (graspable) on a **table** (static surface).
- **Success** = mug center-of-mass lifted ≥ `LIFT_THRESHOLD_M` (default **0.10 m**) above
  its rest height within the rollout horizon. This boolean is the curve's y-axis.
- MuJoCo geometry: table = static box/plane; mug = cylinder (r ≈ 0.04 m, h ≈ 0.10 m),
  positioned to roughly match the splat scene so camera angles tell one story.
- ❓ Confirm the captured splat is actually a mug on a table. If it's a different object,
  edit this section first — everything keys off it.

## 2. Curriculum spec  (B2 `brain/` → A2 `sim/`)
JSON Schema: [`schemas/curriculum.schema.json`](schemas/curriculum.schema.json). Example:
```json
{
  "id": "curr_0007",
  "task": "pick_up_mug",
  "object_pose": { "x": 0.05, "y": -0.02, "z": 0.0, "yaw_deg": 90 },
  "lighting": { "brightness": 0.6, "direction_deg": 45 },
  "occluder": { "present": true, "type": "bowl", "x": 0.08, "y": 0.0 },
  "difficulty": "medium",
  "prompt": "Pick up the mug, rotated 90° and partially occluded by a bowl."
}
```
Rules: pose in meters relative to the object's rest position; `yaw_deg` in degrees;
`brightness` 0–1; if `occluder.present` is false, ignore its other fields;
`difficulty` ∈ {easy, medium, hard}.

## 3. Loop-output artifact  (A6/A7 `loop/` → B5 `dashboard/`)
Each iteration writes `runs/<run_id>/iter_<NN>/`:
- `metrics.json` — schema: [`schemas/metrics.schema.json`](schemas/metrics.schema.json)
- `render.mp4` — one representative rollout render (splat-rendered)
- `critic.txt` — a few critic reasoning samples

`metrics.json` example:
```json
{
  "iteration": 3,
  "run_id": "2026-06-28_overnight",
  "success_rate": 0.72,
  "n_rollouts": 30,
  "adapter_path": "adapters/iter_03",
  "curriculum_ids": ["curr_0007", "curr_0008"],
  "timestamp": "2026-06-28T03:14:00Z"
}
```
The dashboard reads every `iter_*/metrics.json` in order to draw the climbing curve;
the "Run loop" button replays them.

## 4. Trajectory / replay buffer  (A4 `loop/` ↔ B4 `storage/`)
MongoDB Atlas collection **`trajectories`** (schemaless store, documented shape):
```json
{
  "run_id": "2026-06-28_overnight",
  "iteration": 3,
  "curriculum_id": "curr_0007",
  "scene": { "object_pose": {}, "lighting": {}, "occluder": {} },
  "actions": [[0.0, 0.0, 0.0]],
  "success": true,
  "critic": { "pass": true, "reason": "clean top grasp", "difficulty": "medium" },
  "embedding": [0.0]
}
```
Failure vector search (B4): embed `critic.reason` of failures with **Voyage**; query
nearest past failures to choose the next curriculum batch.

## 5. Environment
See [`.env.example`](.env.example). Copy to `.env` and fill real values. Never commit `.env`.

## 6. Repo layout (proposed)
```
CONTRACTS.md          # this file
.env.example
schemas/              # JSON Schemas for the cross-track contracts
sim/      (Track A)   # MuJoCo scene, rollouts, success signal
loop/     (Track A)   # orchestrator, LoRA harness, checkpoints
brain/    (Track B)   # curriculum generator, VLM critic
storage/  (Track B)   # Atlas + Voyage replay buffer
dashboard/(Track B)   # splat viewer + success-rate chart
runs/                 # generated artifacts (gitignored)
adapters/             # trained checkpoints (gitignored)
```

## Sign-off
- [ ] Shivam (Track A) agrees
- [ ] Jay (Track B) agrees
