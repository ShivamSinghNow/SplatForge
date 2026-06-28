# Splat scenes

Drop your Gaussian-splat scans here, then list them in `scenes.json`.

## Add a scan
1. Export from Polycam / Luma as **`.ply`** (or `.splat` / `.ksplat`).
2. Copy the file into this folder, e.g. `web/public/splats/soda_can.ply`.
3. Add an entry to `scenes.json`:
   ```json
   {
     "id": "soda_can",
     "name": "Soda can on table",
     "src": "/splats/soda_can.ply",
     "rollout": "/pick_success.mp4"
   }
   ```
   - `src` is the path **relative to the web root** (this folder is served at `/splats/`).
   - `rollout` (optional) is the pick clip to play on Run loop for this scene.
   - Optional camera framing if a scan loads sideways:
     `"cameraUp": [0,1,0], "cameraPosition": [2.2,1.6,2.2], "cameraLookAt": [0,0,0]`.
4. Refresh the dashboard — the scene dropdown updates automatically.

## Notes
- `.ply` splats can be large (50–150 MB). If load is slow, convert to `.ksplat`.
- Scans are **gitignored** (too big for the repo); they live locally for the demo.
  Only `scenes.json`, this README, and `placeholder.splat` are committed.
