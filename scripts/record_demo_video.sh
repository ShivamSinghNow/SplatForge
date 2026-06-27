#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/demo/submission"
OUT_FILE="$OUT_DIR/splatforge_demo_1min.mp4"
URL="${DEMO_URL:-http://127.0.0.1:5173}"

mkdir -p "$OUT_DIR"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required. Install with: brew install ffmpeg"
  echo "Then record manually using docs/demo_script.md (1-minute cut)."
  exit 1
fi

if ! curl -fsS "$URL" >/dev/null 2>&1; then
  echo "Dashboard not reachable at $URL"
  echo "Start it with: cd web && npm run dev"
  exit 1
fi

echo "Recording 65 seconds from $URL"
echo "Click 'Present demo' immediately after recording starts."
echo "Output: $OUT_FILE"

# macOS avfoundation screen capture — user may need to grant screen permission.
ffmpeg -y \
  -f avfoundation \
  -capture_cursor 1 \
  -i "1:none" \
  -t 65 \
  -vf "scale=1920:1080" \
  -r 30 \
  "$OUT_FILE"

echo "Saved $OUT_FILE"
