#!/usr/bin/env bash
# Normalizes the 1440x900 capture onto the 1920x1080 deliverable canvas: scaled
# to 1728x1080 rather than cropped, and pillarboxed with DEMO_PAD. The result is
# the silent cut, and the picture narrate.sh narrates over.
set -euo pipefail

DIR="${DEMO_DIR:-${TMPDIR:-/tmp}/layerhand-demo}"
FF="${DEMO_FFMPEG:-$(command -v ffmpeg || true)}"
PAD="${DEMO_PAD:-#F3F0E8}"

[ -x "$FF" ] || { echo "no ffmpeg executable found at ${FF:-PATH}" >&2; exit 1; }
[ -f "$DIR/capture.webm" ] || { echo "missing $DIR/capture.webm (run scripts/demo/record.mjs first)" >&2; exit 1; }

"$FF" -y -loglevel error -i "$DIR/capture.webm" \
  -vf "scale=1728:1080,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=$PAD,fps=25,format=yuv420p" \
  -an "$DIR/capture-joined.mp4"
echo "capture prepared: $DIR/capture-joined.mp4"
