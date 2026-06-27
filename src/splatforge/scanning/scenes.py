from __future__ import annotations

import json
from pathlib import Path

from splatforge.models import SceneSpec


def load_scene(scene_name: str, root: Path = Path("demo/scenes")) -> SceneSpec:
    path = root / f"{scene_name}.json"
    if not path.exists():
        raise FileNotFoundError(f"Scene config not found: {path}")

    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return SceneSpec(**payload)
