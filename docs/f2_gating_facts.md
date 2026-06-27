# F2 Gating Facts: H100 Droplet And Splat Asset

Goal: verify the two facts that gate Isaac/GPU work before building on top of
them.

## Current Status

- **Trivial adapter training:** verified by `tests/test_workflow.py`. The
  dry-run loop starts with a failed mug pick, generates variants, updates the
  policy adapter, and retests successfully.
- **Pre-captured mug-table splat:** not present. `demo/scenes/mug_table.json`
  points at `demo/assets/mug_table.splat`, but no `.splat` or `.ply` file exists
  in the workspace.
- **Public 3DGS fallback:** selected. Use the public
  `Voxel51/gaussian_splatting` Hugging Face dataset and fetch
  `FO_dataset/truck/point_cloud_folder/reconstruction_7000.ply`.
- **DigitalOcean H100:** not verified from this machine yet. `doctl` is not
  installed and no DigitalOcean token/project context is available in the repo.

## Local Verification Commands

Run the trivial train/retest proof:

```bash
python -m pytest tests/test_workflow.py
```

Fetch the public Gaussian Splat fallback:

```bash
python scripts/fetch_public_splat.py
```

If local CA certificates block Python TLS verification, retry once with:

```bash
python scripts/fetch_public_splat.py --insecure
```

Expected local asset after fetch:

```text
demo/assets/public_truck_reconstruction_7000.ply
```

The public asset is intentionally not committed. It is large binary data and can
be reproduced from the documented URL.

## DigitalOcean H100 Start/Stop Runbook

Install and authenticate `doctl`:

```bash
brew install doctl
doctl auth init
doctl account get
```

Create the GPU droplet only when ready to run the proof job:

```bash
doctl compute droplet create splatforge-h100-f2 \
  --region nyc2 \
  --image ubuntu-22-04-x64 \
  --size gpu-h100x1-80gb \
  --ssh-keys <ssh-key-id> \
  --wait
```

Record the droplet IP and SSH in:

```bash
doctl compute droplet list --format ID,Name,PublicIPv4,Status
ssh root@<droplet-ip>
```

On the droplet, run the smallest repo proof:

```bash
apt-get update
apt-get install -y python3-venv git
git clone <repo-url> SplatForge
cd SplatForge
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m pytest tests/test_workflow.py
```

Stop cost immediately after the proof. Prefer destroying the disposable droplet
instead of leaving it powered off:

```bash
doctl compute droplet delete splatforge-h100-f2 --force
doctl compute droplet list --format ID,Name,Status
```

Acceptance evidence to capture before deletion:

- Droplet ID, region, size, created time, and deletion time.
- `nvidia-smi` output proving the H100 is visible.
- `python -m pytest tests/test_workflow.py` output proving one trivial train job.
- Confirmation that the droplet no longer appears after deletion.

## Gate Decision

Do not build Isaac-specific features on this branch until the H100 proof has
actually run with DigitalOcean credentials and the selected splat asset has been
materialized for the team. The branch currently makes those blockers explicit
and provides the exact steps to close them.
