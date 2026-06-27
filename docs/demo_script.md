# B6 Demo Script — 3 Minute Rehearsal

This is the rehearsable flow for the SplatForge overnight-run demo. Target runtime: **~3 minutes**.
For submission, record a **1-minute cut** using the highlight section below.

## Setup

```bash
# Terminal 1 — API
cd SplatForge
source .venv/bin/activate
pip install -e ".[dev,rerun]"
uvicorn splatforge.api.app:app --reload

# Terminal 2 — Dashboard
cd web
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

If the API is offline, the dashboard loads the **overnight fixture run** in Demo Mode.

## One-Button Flow

1. Click **Present demo** in the top bar.
2. Confirm the banner reads **replaying our overnight run**.
3. Let the presentation auto-advance through all beats (~168 seconds total).

## Beat Sheet (~3 min)

| Time | Beat | What to show | Narration cue |
|------|------|--------------|---------------|
| 0:00–0:04 | Intro | Control room + overnight banner | "This is SplatForge replaying our overnight mug-pick run." |
| 0:04–0:32 | Fly-through | Rerun viewer jumps to failure frame | "First attempt fails — gripper misses the occluded handle." |
| 0:32–1:04 | Critique | Council panel + Gemini/physics reasoning | "The critic council explains why the grasp failed." |
| 1:04–1:32 | Curriculum | Curriculum panel + generated variants | "Gemini emits structured practice scenes from the failure." |
| 1:32–2:04 | Curve | Success-rate chart climbs 37 → 67 | "Practice variants train the adapter; success rate climbs." |
| 2:04–2:40 | Retest | Rerun retest frame + chart hits 78 | "Retest on the original scene — the robot now succeeds." |
| 2:40–2:48 | Complete | Policy panel + improvement proof | "Same scene, better policy — improvement verified." |

## 1-Minute Submission Cut

Record only these beats (~60 seconds):

1. **0:00–0:08** — Banner + failure fly-through
2. **0:08–0:22** — Critic reasoning (consensus + evidence)
3. **0:22–0:35** — Curriculum JSON / variants
4. **0:35–0:50** — Success-rate curve climbing
5. **0:50–1:00** — Retest success marker + final score

## Recording

```bash
# macOS QuickTime: File → New Screen Recording
# or use the helper script (requires ffmpeg + dev server running):
./scripts/record_demo_video.sh
```

Output: `demo/submission/splatforge_demo_1min.mp4`

## Acceptance Checklist

- [ ] Banner shows **replaying our overnight run** during presentation
- [ ] Rerun fly-through visible on failure + retest frames
- [ ] Success-rate chart animates upward during curve beat
- [ ] Council/critic reasoning visible during critique beat
- [ ] 1-minute MP4 exported to `demo/submission/`
