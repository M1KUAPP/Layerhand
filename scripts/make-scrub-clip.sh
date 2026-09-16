#!/usr/bin/env bash
# Build the synthetic landing-page scrub clip and its companion assets:
#   src/web/assets/landing/scrub.mp4          the clip itself
#   src/web/assets/landing/scrub-poster.jpg   its first frame
#   src/web/assets/sample-photo-poster.jpg    a light JPEG of the sample photo
#   src/web/assets/favicon.svg                the placeholder favicon source
#   src/web/assets/favicon.ico                rendered from the SVG at 32+16 px
# Everything derives from src/web/assets/sample-photo.png and reruns
# deterministically. Requires ffmpeg and bun.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$ROOT/src/web/assets"
LANDING="$ASSETS/landing"
PHOTO="$ASSETS/sample-photo.png"
MP4="$LANDING/scrub.mp4"
POSTER="$LANDING/scrub-poster.jpg"
PHOTO_JPG="$ASSETS/sample-photo-poster.jpg"
FAVICON_SVG="$ASSETS/favicon.svg"
FAVICON_ICO="$ASSETS/favicon.ico"

mkdir -p "$LANDING"

# --- scrub clip -------------------------------------------------------------
# 1280x720, 4 s at 30 fps, silent. The photograph is scaled and centre-
# cropped to fill the frame edge to edge, then stacked as three full-frame
# sheets: the untinted base, a copy overlaid with #C7FF4A at 0.25 alpha and
# a copy overlaid with #11110F at 0.20 alpha. Each sheet carries a 2 px
# #11110F outline that fades in over the first second, and the two upper
# sheets fade in with it, so frame zero stays the plain photograph. Over
# four seconds with a cubic ease-out the middle sheet slides 48 px up and
# 80 px right and the top sheet twice as far; the frame clips them, so
# their far edges leave a gap where the sheet below shows.
GRAPH="$(mktemp)"
trap 'rm -f "$GRAPH"' EXIT
cat >"$GRAPH" <<'GRAPH_EOF'
[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[photo];
[photo]split=3[base][midsrc][topsrc];
color=c=0xC7FF4A@0.25:s=1280x720:d=4:r=30,format=rgba[tintm];
color=c=0x11110F@0.20:s=1280x720:d=4:r=30,format=rgba[tintt];
[midsrc][tintm]overlay=0:0[midraw];
[topsrc][tintt]overlay=0:0[topraw];
[midraw]format=rgba,fade=t=in:st=0:d=1:alpha=1[mid];
[topraw]format=rgba,fade=t=in:st=0:d=1:alpha=1[top];
color=c=black@0:s=1280x720:d=4:r=30,format=rgba,drawbox=x=0:y=0:w=1280:h=720:c=0x11110F:t=2:replace=1,fade=t=in:st=0:d=1:alpha=1[ol];
[ol]split=3[olb][olm][olt];
[base][olb]overlay=0:0[v0];
[v0][mid]overlay=x='round(80*(1-pow(1-t/4,3)))':y='round(-48*(1-pow(1-t/4,3)))'[v1];
[v1][olm]overlay=x='round(80*(1-pow(1-t/4,3)))':y='round(-48*(1-pow(1-t/4,3)))'[v2];
[v2][top]overlay=x='round(160*(1-pow(1-t/4,3)))':y='round(-96*(1-pow(1-t/4,3)))'[v3];
[v3][olt]overlay=x='round(160*(1-pow(1-t/4,3)))':y='round(-96*(1-pow(1-t/4,3)))'[vout]
GRAPH_EOF

# All-intra keyframes for instant seeking while scrubbing. Raise the CRF in
# steps of two if the result ever exceeds the 6 MB budget.
LIMIT=$((6 * 1024 * 1024))
crf=20
while :; do
  ffmpeg -y -hide_banner -loglevel error \
    -framerate 30 -loop 1 -t 4 -i "$PHOTO" \
    -filter_complex_script "$GRAPH" \
    -map '[vout]' -r 30 -t 4 -an \
    -c:v libx264 -g 1 -crf "$crf" -pix_fmt yuv420p -movflags +faststart \
    "$MP4"
  size=$(stat -c%s "$MP4")
  [ "$size" -le "$LIMIT" ] && break
  crf=$((crf + 2))
  if [ "$crf" -gt 40 ]; then
    echo "scrub.mp4 still ${size} bytes at crf 40" >&2
    exit 1
  fi
done
echo "scrub.mp4: ${size} bytes at crf ${crf}"

ffmpeg -y -hide_banner -loglevel error \
  -i "$MP4" -frames:v 1 -update 1 -q:v 3 "$POSTER"
echo "scrub-poster.jpg: $(stat -c%s "$POSTER") bytes"

# --- sample photo poster ----------------------------------------------------
# The mjpeg encoder tops out under 150 KB for this image even at -q:v 1, so
# the JPEG goes through sharp (a devDependency) instead. Pick the first
# quality in the 150 to 250 KB band, keeping the 1536x1024 size.
PHOTO_SRC="$PHOTO" PHOTO_OUT="$PHOTO_JPG" bun -e '
  import sharp from "sharp"
  import { statSync } from "node:fs"
  for (let q = 95; q >= 70; q--) {
    await sharp(process.env.PHOTO_SRC).jpeg({ quality: q }).toFile(process.env.PHOTO_OUT)
    const kb = statSync(process.env.PHOTO_OUT).size / 1024
    if (kb >= 150 && kb <= 250) {
      console.log(`sample-photo-poster.jpg: quality ${q}, ${kb.toFixed(0)} KB`)
      break
    }
  }
'

# --- favicon ----------------------------------------------------------------
cat >"$FAVICON_SVG" <<'SVG_EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#C7FF4A"/>
  <text x="16" y="24" font-family="Newsreader, Georgia, serif" font-size="24" fill="#11110F" text-anchor="middle">L</text>
</svg>
SVG_EOF

ffmpeg -y -hide_banner -loglevel error -i "$FAVICON_SVG" \
  -filter_complex '[0:v]split=2[a][b];[a]scale=32:32[o32];[b]scale=16:16[o16]' \
  -map '[o32]' -map '[o16]' -f ico "$FAVICON_ICO"
echo "favicon.ico: $(stat -c%s "$FAVICON_ICO") bytes"
