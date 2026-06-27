from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel

from splatforge.models import SceneSpec


class GatingFact(BaseModel):
    id: str
    label: str
    verified: bool
    evidence: str
    next_step: str


def verify_splat_asset(scene: SceneSpec, root: Path = Path(".")) -> GatingFact:
    asset_path = _resolve_path(scene.splat_asset, root)
    fallback_asset = scene.metadata.get("public_fallback_splat")
    placeholder_markers = (
        str(scene.metadata.get("scan_source", "")).lower(),
        str(scene.metadata.get("task_notes", "")).lower(),
    )
    marked_placeholder = any("placeholder" in marker for marker in placeholder_markers)

    if not asset_path.exists():
        return GatingFact(
            id="splat_asset",
            label="Gaussian Splat Asset",
            verified=False,
            evidence=f"Missing asset at {asset_path}.",
            next_step=_missing_splat_next_step(fallback_asset),
        )

    if marked_placeholder:
        return GatingFact(
            id="splat_asset",
            label="Gaussian Splat Asset",
            verified=False,
            evidence=f"Scene {scene.scene_id} still declares placeholder scan metadata.",
            next_step="Replace placeholder metadata after capturing a real scan export.",
        )

    return GatingFact(
        id="splat_asset",
        label="Gaussian Splat Asset",
        verified=True,
        evidence=f"Found non-placeholder Gaussian Splat asset at {asset_path}.",
        next_step="Ready for GPU simulation loading.",
    )


def verify_h100_droplet(environ: dict[str, str] | None = None) -> GatingFact:
    environ = environ or os.environ
    droplet_id = environ.get("DIGITALOCEAN_H100_DROPLET_ID") or environ.get("DO_H100_DROPLET_ID")
    gpu_type = environ.get("DIGITALOCEAN_GPU_TYPE") or environ.get("DO_GPU_TYPE")
    worker_url = environ.get("DIGITALOCEAN_WORKER_URL")

    if droplet_id and gpu_type and "h100" in gpu_type.lower():
        return GatingFact(
            id="h100_droplet",
            label="DigitalOcean H100 Droplet",
            verified=True,
            evidence=f"Droplet {droplet_id} declares GPU type {gpu_type}.",
            next_step="Run Isaac backend smoke tests against the GPU worker.",
        )

    missing = []
    if not droplet_id:
        missing.append("DIGITALOCEAN_H100_DROPLET_ID")
    if not gpu_type:
        missing.append("DIGITALOCEAN_GPU_TYPE=H100")
    elif "h100" not in gpu_type.lower():
        missing.append("DIGITALOCEAN_GPU_TYPE must include H100")

    if worker_url:
        evidence = (
            f"Worker URL configured at {worker_url}, "
            "but H100 droplet identity is not verified."
        )
    else:
        evidence = f"Missing {', '.join(missing)}."
    return GatingFact(
        id="h100_droplet",
        label="DigitalOcean H100 Droplet",
        verified=False,
        evidence=evidence,
        next_step=(
            "Create or identify the DigitalOcean H100 droplet and set its ID "
            "plus GPU type in .env."
        ),
    )


def gating_facts(scene: SceneSpec, root: Path = Path(".")) -> list[GatingFact]:
    return [verify_splat_asset(scene, root), verify_h100_droplet()]


def _missing_splat_next_step(fallback_asset: object) -> str:
    if fallback_asset:
        return f"Run scripts/fetch_public_splat.py to materialize {fallback_asset}."
    return "Export the tabletop scan to a .splat file and update the scene config."


def _resolve_path(path: Path, root: Path) -> Path:
    return path if path.is_absolute() else root / path
