# Scrub clip

`scrub.mp4` is a synthetic illustration cut from
[the sample photograph](../sample-photo.png) by
`scripts/make-scrub-clip.sh`. It stands in for the Gemini clip described
in [the video pipeline](../../../../docs/research/design/video-pipeline.md)
until a person produces one, and no text is baked in.

The photograph is scaled and centre-cropped to fill the 16:9 frame and
stays put as the bottom sheet, still and whole for the entire clip.
Above it sit two full-frame translucent planes: the accent `#C7FF4A` at
0.3 alpha and the ink `#11110F` at 0.18 alpha, each carrying a 2 px
`#11110F` outline at full alpha. Both planes fade in over the first
second, outlines included, so the first frame is the plain photograph.
With a cubic ease-out they slide up and right on the diagonal, the
middle sheet ending 48 px up and 80 px right and the top sheet twice as
far; their far edges leave the frame, which is intended.

- Built: September 17, 2026
- Encoder: ffmpeg 6.1.1-3ubuntu5, libx264, every frame a keyframe
  (`-g 1 -crf 20`), `yuv420p`, `+faststart`, no audio
- Dimensions: 1280x720, 4.0 seconds at 30 fps
- File sizes: `scrub.mp4` 2,556,392 bytes, `scrub-poster.jpg`
  31,920 bytes
- Rebuild: `bash scripts/make-scrub-clip.sh` from the repository root
