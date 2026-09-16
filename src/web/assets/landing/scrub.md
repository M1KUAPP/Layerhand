# Scrub clip

`scrub.mp4` is a synthetic illustration cut from
[the sample photograph](../sample-photo.png) by
`scripts/make-scrub-clip.sh`. It stands in for the Gemini clip described
in [the video pipeline](../../../../docs/research/design/video-pipeline.md)
until a person produces one, and no text is baked in.

The photograph is scaled and centre-cropped to fill the 16:9 frame, then
stacked as three full-frame sheets: the untinted base, a copy overlaid
with `#C7FF4A` at 0.25 alpha and a copy overlaid with `#11110F` at 0.20
alpha. Each sheet carries a 2 px `#11110F` outline that fades in over the
first second, and the two upper sheets fade in with it, so the first
frame is the plain photograph. With a cubic ease-out the middle sheet
slides 48 px up and 80 px right and the top sheet twice as far; the
frame clips them, so the gap left behind shows the sheet below.

- Built: September 17, 2026
- Encoder: ffmpeg 6.1.1-3ubuntu5, libx264, every frame a keyframe
  (`-g 1 -crf 20`), `yuv420p`, `+faststart`, no audio
- Dimensions: 1280x720, 4.0 seconds at 30 fps
- File sizes: `scrub.mp4` 2,748,555 bytes, `scrub-poster.jpg`
  31,920 bytes
- Rebuild: `bash scripts/make-scrub-clip.sh` from the repository root
