#!/usr/bin/env bash
# Narrates the capture and muxes the two into the deliverable.
#
# Narration is rendered one line at a time and delayed to the beat it describes,
# using the offsets record.mjs measured. One continuous read drifts out of sync
# within a few seconds and then actively contradicts the picture.
set -euo pipefail

DIR="${DEMO_DIR:-${TMPDIR:-/tmp}/layerhand-demo}"
SPEAK="${DEMO_SPEAK:-$(dirname "$0")/speak.py}"

# Resolve the portable Kokoro runtime path. KOKORO_HOME can point elsewhere.
KOKORO="${KOKORO_HOME:-$HOME/.local/share/layerhand-demo}"

# speak.py re-execs itself into the Chatterbox venv when DEMO_TTS=chatterbox, so
# this only has to be a Python that can import the Kokoro path, or plain python3.
PY="${DEMO_PYTHON:-$KOKORO/.venv/bin/python}"
[ -x "$PY" ] || PY="$(command -v python3)"
SCRIPT="${DEMO_SCRIPT:-$(dirname "$0")/narration.txt}"
FF="${DEMO_FFMPEG:-$(command -v ffmpeg || echo "$DIR/node_modules/ffmpeg-static/ffmpeg")}"
OUT="${DEMO_OUT:-$DIR/demo.mp4}"
BGM="${DEMO_BGM:-}"
BGM_GAIN_DB="${DEMO_BGM_GAIN_DB:--17}"
MIN_DURATION="${DEMO_MIN_DURATION:-30}"
MAX_DURATION="${DEMO_MAX_DURATION:-120}"

# assemble.sh joins the capture to the pitch slides; when it has run, that is
# the video to narrate over. Falls back to the raw capture for a plain demo.
# Sampled from the app's own background so the pillarbox bars blend seamlessly.
PAD="${DEMO_PAD:-#F3F0E8}"
SRC="${DEMO_SOURCE:-$DIR/capture-joined.mp4}"
[ -f "$SRC" ] || SRC="$DIR/capture.webm"
for f in "$SRC" "$DIR/beats.json" "$SCRIPT"; do
  [ -f "$f" ] || { echo "missing: $f (run record.mjs first)" >&2; exit 1; }
done
[ -x "$FF" ] || { echo "no ffmpeg at $FF" >&2; exit 1; }

rm -rf "$DIR/seg" && mkdir -p "$DIR/seg"

# Resolve each line against its measured beat and record the next visual boundary.
# schedule.py rejects speech that outlives that boundary instead of silently
# narrating over a different screen.
python3 "$(dirname "$0")/manifest.py" "$DIR" "$SCRIPT"

n=$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1]))))" "$DIR/lines.json")
[ "$n" -gt 0 ] || { echo "no narration lines resolved" >&2; exit 1; }

# Batch mode keeps heavyweight voice models resident for the whole script. A
# per-line Chatterbox process spends most of its time reloading the same model.
"$PY" "$SPEAK" --batch "$DIR/lines.json" "$DIR/seg"

# A beat says when a moment happens, not how long the line about it takes to
# read. Clear any narration-to-narration collision, then reject a line that would
# outlive its matching visual -- before subtitles inherit those timings.
if [ -f "$(dirname "$0")/schedule.py" ]; then
  python3 "$(dirname "$0")/schedule.py" "$DIR" || exit 1
fi

# Subtitles come from the same lines.json and the same wavs, so the words on
# screen cannot drift from the words being spoken.
python3 "$(dirname "$0")/subtitles.py" "$DIR"

# One delayed input per line, mixed onto a common timeline.
inputs=(); filters=""; labels=""
for i in $(seq 0 $((n - 1))); do
  ms=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[int(sys.argv[2])]['ms'])" "$DIR/lines.json" "$i")
  inputs+=(-i "$DIR/seg/$i.wav")
  filters="$filters[$i:a]adelay=$ms|$ms[a$i];"
  labels="$labels[a$i]"
done
"$FF" -y "${inputs[@]}" \
  -filter_complex "${filters}${labels}amix=inputs=$n:normalize=0,loudnorm=I=-18:TP=-2:LRA=7[out]" \
  -map "[out]" -ar 44100 "$DIR/narration.wav" >/dev/null 2>&1

# ffmpeg -i with no output file reports the duration and then exits non-zero,
# which pipefail turns into an abort. Swallow the status; the probe is the point.
dur() {
  local probe
  probe=$({ "$FF" -i "$1" 2>&1 || true; })
  awk -F'Duration: ' '/Duration: /{split($2,a,","); split(a[1],t,":");
    print t[1]*3600+t[2]*60+t[3]; exit}' <<<"$probe"
}
vid=$(dur "$SRC"); aud=$(dur "$DIR/narration.wav")

# The capture is 1440x900, which is 16:10. Cropping to 16:9 would cut content, so
# it scales to 1728x1080 and pads with DEMO_PAD, which should be the app's own
# background colour so the bars are invisible. If the closing line outruns the picture, hold the
# last frame rather than cutting the sentence off.
pad=$(awk -v a="$aud" -v v="$vid" 'BEGIN{d=a-v; print (d>0)? d+0.4 : 0}')
tpad=$(awk -v p="$pad" 'BEGIN{ if (p>0) printf "tpad=stop_mode=clone:stop_duration=%.3f,", p }')
total=$(awk -v p="$pad" -v v="$vid" 'BEGIN{printf "%.3f", v+p}')
# Alignment=2 is bottom-centre in libass. BorderStyle=3 draws a box behind the
# text rather than an outline, which is the only thing that stays readable over a
# screenshot whose background we do not control. Geist matches the product;
# the compact type and low margin leave the interface unobscured. A narrow box
# pad keeps the backing strips of a two-line cue from touching each other.
subs="subtitles='$DIR/narration.srt':force_style='FontName=Geist,FontSize=10.5,PrimaryColour=&H00FFFFFF,OutlineColour=&H70101310,BorderStyle=3,Outline=0.75,Shadow=0,Alignment=2,MarginV=10,Spacing=0.2'"

# The raw capture is 1440x900 and needs scaling into a 1920x1080 frame. The
# joined pitch cut is ALREADY 1920x1080, and re-applying that scale would shrink
# the picture inside a second set of bars -- silently, since ffmpeg is happy to
# letterbox something that already fits. Ask the file rather than assume.
src_w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$SRC" | head -1)
if [ "${src_w:-0}" -ge 1920 ]; then fit=""; else fit="scale=1728:1080,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=$PAD,"; fi

if [ -n "$BGM" ]; then
  [ -f "$BGM" ] || { echo "missing BGM: $BGM" >&2; exit 1; }
  fade_in=$(awk -v t="$total" 'BEGIN{printf "%.3f", (t<6)? t/3 : 2}')
  fade_out=$(awk -v t="$total" 'BEGIN{printf "%.3f", (t<12)? t/3 : 4}')
  fade_start=$(awk -v t="$total" -v d="$fade_out" 'BEGIN{printf "%.3f", t-d}')
  "$FF" -y -i "$SRC" -i "$DIR/narration.wav" -stream_loop -1 -i "$BGM" \
    -filter_complex "[0:v]${tpad}${fit}${subs}[v];[1:a]pan=stereo|c0=c0|c1=c0,asplit=2[voice][side-source];[side-source]apad=whole_dur=$total[side];[2:a]atrim=start=0:end=$total,asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,volume=${BGM_GAIN_DB}dB,afade=t=in:st=0:d=$fade_in,afade=t=out:st=$fade_start:d=$fade_out[music];[music][side]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=500:knee=2.8[ducked];[voice][ducked]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.95:attack=5:release=50:level=false:latency=true[a]" \
    -map "[v]" -map "[a]" -t "$total" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -ar 44100 -ac 2 -movflags +faststart "$OUT" >/dev/null 2>&1
else
  "$FF" -y -i "$SRC" -i "$DIR/narration.wav" \
    -filter_complex "[0:v]${tpad}${fit}${subs}[v]" \
    -map "[v]" -map 1:a -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -movflags +faststart "$OUT" >/dev/null 2>&1
fi

delivered=$(dur "$OUT")
if ! awk -v d="$delivered" -v lo="$MIN_DURATION" -v hi="$MAX_DURATION" \
  'BEGIN { exit !(d >= lo && d <= hi) }'; then
  echo "deliverable duration ${delivered}s is outside ${MIN_DURATION}-${MAX_DURATION}s" >&2
  exit 1
fi

printf 'video %.1fs  narration %.1fs  tail-pad %.1fs\n' "$vid" "$aud" "$pad"
ls -lh "$OUT" | awk '{print "output: " $NF " (" $5 ")"}'
