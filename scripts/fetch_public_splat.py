from __future__ import annotations

import argparse
import shutil
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path


DEFAULT_URL = (
    "https://huggingface.co/datasets/Voxel51/gaussian_splatting/resolve/main/"
    "FO_dataset/truck/point_cloud_folder/reconstruction_7000.ply"
)
DEFAULT_OUTPUT = Path("demo/assets/public_truck_reconstruction_7000.ply")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch a public Gaussian Splat PLY fallback asset for SplatForge."
    )
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Disable TLS verification only if local CA certificates are broken.",
    )
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    context = ssl._create_unverified_context() if args.insecure else None
    request = urllib.request.Request(args.url, headers={"User-Agent": "SplatForge/0.1"})

    print(f"Downloading {args.url}")
    print(f"Writing {args.output}")
    with urllib.request.urlopen(request, context=context, timeout=60) as response:
        with args.output.open("wb") as handle:
            shutil.copyfileobj(response, handle)

    size_mb = args.output.stat().st_size / (1024 * 1024)
    print(f"Fetched {args.output} ({size_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as exc:
        print(f"Download failed: {exc}", file=sys.stderr)
        print(
            "If this is a local CA issue, retry with --insecure as a temporary workaround.",
            file=sys.stderr,
        )
        raise SystemExit(1)
