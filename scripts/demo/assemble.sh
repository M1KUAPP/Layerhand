#!/usr/bin/env bash
# Joins the product capture to optional pitch slides and extends beats.json so the
# narration can name a slide the same way it names a moment on screen.
#
# The normal path is a direct product walkthrough without slides. If DEMO_SLIDES
# is unset or empty, this script normalizes the raw capture to 1920x1080 without
# requiring any slide images or extra beats.
#
# When slides are provided, they are stills and their "beat" is simply where they
# start on the joined timeline. Writing them into beats.json keeps ONE scheduling
# model: narration.txt names a beat, schedule.py spaces the lines.
set -euo pipefail

DIR="${DEMO_DIR:-${TMPDIR:-/tmp}/layerhand-demo}"
FF="${DEMO_FFMPEG:-$(command -v ffmpeg || true)}"
FFPROBE="${DEMO_FFPROBE:-$(command -v ffprobe || true)}"
PAD="${DEMO_PAD:-#F3F0E8}"

[ -x "$FF" ] || { echo "no ffmpeg executable found at ${FF:-PATH}" >&2; exit 1; }
[ -f "$DIR/capture.webm" ] || { echo "missing $DIR/capture.webm (run scripts/demo/record.mjs first)" >&2; exit 1; }
[ -f "$DIR/beats.json" ] || { echo "missing $DIR/beats.json (run scripts/demo/record.mjs first)" >&2; exit 1; }

# "name:seconds", in the order they appear after the capture. Optional.
DEMO_SLIDES="${DEMO_SLIDES:-}"

# Normal path: no slides required. Normalize capture to 1920x1080 deliverable canvas.
if [ -z "${DEMO_SLIDES// /}" ]; then
  echo "No DEMO_SLIDES specified; normalizing capture to 1920x1080 canvas without slides."
  "$FF" -y -loglevel error -i "$DIR/capture.webm" \
    -vf "scale=1728:1080,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=$PAD,fps=25,format=yuv420p" \
    -an "$DIR/capture-joined.mp4"
  echo "capture prepared (no slides): $DIR/capture-joined.mp4"
  exit 0
fi

# Optional slide path: verify every required slide PNG exists.
for pair in $DEMO_SLIDES; do
  name="${pair%%:*}"
  f="$DIR/slide-$name.png"
  [ -f "$f" ] || { echo "missing $f (run scripts/demo/slides/render.mjs first)" >&2; exit 1; }
done

# The capture is 1440x900; the slides are 1920x1080. Normalise both to 1920x1080
# here rather than at mux time, because concat demands identical streams and a
# mismatch fails silently by dropping frames rather than by erroring.
"$FF" -y -loglevel error -i "$DIR/capture.webm" \
  -vf "scale=1728:1080,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=$PAD,fps=25,format=yuv420p" \
  -an "$DIR/seg-capture.mp4"

for pair in $DEMO_SLIDES; do
  name="${pair%%:*}"
  secs="${pair##*:}"
  "$FF" -y -loglevel error -loop 1 -t "$secs" -i "$DIR/slide-$name.png" \
    -vf "scale=1920:1080,fps=25,format=yuv420p" "$DIR/seg-$name.mp4"
done

printf "file '%s'\n" "$DIR/seg-capture.mp4" > "$DIR/concat.txt"
for pair in $DEMO_SLIDES; do
  printf "file '%s'\n" "$DIR/seg-${pair%%:*}.mp4" >> "$DIR/concat.txt"
done
"$FF" -y -loglevel error -f concat -safe 0 -i "$DIR/concat.txt" -c copy "$DIR/pitch.mp4"

python3 - "$DIR" "$DEMO_SLIDES" "$FFPROBE" <<'PY'
import json, subprocess, sys
from pathlib import Path

d = Path(sys.argv[1])
slides = [(p.split(':')[0], int(p.split(':')[1])) for p in sys.argv[2].split()]
ffprobe_bin = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else 'ffprobe'

def secs(p):
    out = subprocess.run([ffprobe_bin, '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'csv=p=0', str(p)], capture_output=True, text=True).stdout.strip()
    return float(out)

cap = round(secs(d / 'seg-capture.mp4') * 1000)
beats = [b for b in json.loads((d / 'beats.json').read_text()) if b['name'] != 'end']
cursor = cap
for name, secs_ in slides:
    beats.append({'name': name, 'ms': cursor})
    cursor += secs_ * 1000
beats.append({'name': 'end', 'ms': cursor})
(d / 'beats.json').write_text(f'{json.dumps(beats, indent=2)}\n')
print(f'  capture {cap}ms + slides {cursor - cap}ms')
for b in beats:
    print(f'    {b["ms"]:>7}ms  {b["name"]}')
PY

mv "$DIR/pitch.mp4" "$DIR/capture-joined.mp4"
echo "joined: $DIR/capture-joined.mp4"
