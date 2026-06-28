"""Generate a small placeholder .splat so the WebGL viewer renders before real
phone scans exist. Antimatter15/.splat format: 32 bytes per gaussian —
position(3xf32) + scale(3xf32) + rgba(4xu8) + rotation(4xu8). Replace with your
own Polycam/Luma export (.ply or .splat) dropped into web/public/splats/.
"""

from __future__ import annotations

import random
import struct
from pathlib import Path

OUT = Path("web/public/splats/placeholder.splat")
N = 16000
SCALE = 0.018


def main() -> None:
    rng = random.Random(0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rot = bytes([255, 128, 128, 128])  # ~identity; blobs are isotropic so it's moot

    with OUT.open("wb") as handle:
        for _ in range(N):
            # cube cloud in [-1, 1]^3, colored by position so it's clearly 3D
            x, y, z = (rng.uniform(-1, 1) for _ in range(3))
            r = int((x * 0.5 + 0.5) * 255)
            g = int((y * 0.5 + 0.5) * 255)
            b = int((z * 0.5 + 0.5) * 255)
            handle.write(struct.pack("<3f", x, y, z))
            handle.write(struct.pack("<3f", SCALE, SCALE, SCALE))
            handle.write(bytes([r, g, b, 255]))
            handle.write(rot)

    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB, {N} gaussians)")


if __name__ == "__main__":
    main()
