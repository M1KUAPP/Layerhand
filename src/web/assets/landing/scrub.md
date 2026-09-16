# Scrub clip

`scrub.mp4` is a synthetic illustration cut from
[the sample photograph](../sample-photo.png) by
`scripts/make-scrub-clip.sh`. It stands in for the Gemini clip described
in [the video pipeline](../../../../docs/research/design/video-pipeline.md)
until a person produces one, and no text is baked in.

- Built: September 17, 2026
- Encoder: ffmpeg 6.1.1-3ubuntu5, libx264, every frame a keyframe
  (`-g 1 -crf 20`), `yuv420p`, `+faststart`, no audio
- Dimensions: 1280x720, 4.0 seconds at 30 fps
- File sizes: `scrub.mp4` 2,246,143 bytes, `scrub-poster.jpg`
  24,713 bytes
- Rebuild: `bash scripts/make-scrub-clip.sh` from the repository root
