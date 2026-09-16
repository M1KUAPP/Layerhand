# Landing video pipeline

How agents make footage for the landing page: generate a clip in Gemini
through the claude-in-chrome browser session, remove Gemini's visible
watermark, and encode it for either a silent loop or a scroll-scrubbed
section. Both tools were inspected on September 16, 2026. Nothing was
generated or uploaded while researching.

Contents:

1.  [Generating in Gemini](#generating-in-gemini)
1.  [What Gemini outputs](#what-gemini-outputs)
1.  [Removing the watermark](#removing-the-watermark)
1.  [Encoding for the page](#encoding-for-the-page)
1.  [Writing the prompt](#writing-the-prompt)
1.  [The agent's checklist](#the-agents-checklist)
1.  [See also](#see-also)

## Generating in Gemini

`gemini.google.com/videos` opens "Create videos: try a template or
describe a video in chat. Create with Omni." The team's account is on the
Pro plan.

The composer has:

| Control          | Options                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Upload & tools   | Upload files, Avatar, More uploads, Create image, Create video (selected), Create music, Canvas, More tools |
| Tool chip        | "Videos", which can be deselected                                                                           |
| Model            | 3.5 Flash-Lite, 3.8 Flash (default), 3.1 Pro, Extended thinking                                             |
| Aspect ratio     | Landscape (16:9) or Portrait (9:16)                                                                         |
| Reference button | An image icon under the prompt, for starting frames or references                                           |
| Dictate          | Voice input                                                                                                 |

**Templates.** Thirty-three sit above the composer, including Product
showcase, Logo reveal, Walkthrough, Tiny world, Cut paper, Origami, Comic
book, Noir and 360 photo booth. Choosing one attaches a chip and changes
the placeholder. Product showcase asks to "Add photos of your product",
so a real retouched photograph can seed the clip.

## What Gemini outputs

Measured from a clip already in the account's history:

- **1280x720**, ten seconds, with a sound track.
- **A visible watermark:** a small four-point sparkle in the bottom-right
  corner.
- **Actions:** Download video, Share video and a volume toggle on hover.

720p sits below the 1920x1080 clips on
[MotionSites](motionsites.md#animated-backgrounds). Keep the video out of
full-bleed hero use on large screens, or accept softness under a grain or
glass layer.

## Removing the watermark

`geminiwatermarkremover.io/video` is the browser front end of the
open-source `GargantuaX/gemini-watermark-remover`. It is in beta for
video.

**In the browser:**

- It accepts MP4, WebM or MOV. Clips under 100 MB are the safest first
  test.
- It runs locally, loading ONNX Runtime and WebCodecs, and detects the
  watermark region frame by frame. Nothing is uploaded.
- It shows the original and cleaned video side by side, then exports an
  MP4.
- "Choose video" opens a native file picker, so an agent needs the
  claude-in-chrome file upload tool to use it.

**From the command line**, which is better for agents because it takes a
path, repeats reliably and handles larger files:

```sh
bunx @pilio/gemini-watermark-remover remove gemini-clip.mp4 \
  --output clean.mp4 --video-bitrate-mbps 20
```

- The default is a 12 Mbps AVC encode. Raise it for quality-sensitive
  footage, as above.
- Other flags: `--out-dir <dir>`, `--overwrite`, `--json`, and
  `--video-timeout-ms`, an inactivity timeout that resets as frames
  advance. Progress prints to stderr.
- The file path needs `sharp`, which this repository already has as a dev
  dependency.
- The project also ships an agent skill:

  ```sh
  bunx skills add GargantuaX/gemini-watermark-remover \
    --skill gemini-watermark-remover
  ```

**Limits, from its README:**

- It removes only Gemini's visible bottom-right mark. It works by reverse
  alpha blending against calibrated masks, 96x96 at 64 px margins on
  larger images and 48x48 at 32 px on smaller ones.
- It does **not** remove SynthID, Google's invisible watermark, so the
  file stays identifiable as AI-generated.
- Video cleanup is less mature than image cleanup. Check the corner of
  every exported clip frame by frame before using it.

## Encoding for the page

A clip does one of two jobs, and each needs a different encode.

**A silent loop**, such as the hero demo loop
([FR-30](/docs/PRD.md#launch-surface)):

```sh
ffmpeg -i clean.mp4 -an -c:v libx264 -crf 22 -preset slow \
  -pix_fmt yuv420p -movflags +faststart loop.mp4
ffmpeg -i clean.mp4 -frames:v 1 -q:v 3 loop-poster.jpg
```

- `-an` strips the sound, since the page plays muted anyway, and
  `+faststart` lets playback begin before the file finishes downloading.
- Use `autoplay muted loop playsinline` with the poster. Put a blurred
  low-quality placeholder behind it, as
  [jakubantalik.com does](jakub-antalik.md#selected-work).
- A loop running past five seconds needs a visible pause button
  (WCAG 2.2.2). Under `prefers-reduced-motion`, show the poster and do not
  autoplay.

**A scroll-scrubbed section**, following the
[MotionSites recipe](motionsites.md#scroll-scrubbed-video):

```sh
ffmpeg -i clean.mp4 -an -c:v libx264 -g 1 -crf 20 \
  -pix_fmt yuv420p -movflags +faststart scrub.mp4
mkdir -p frames
ffmpeg -i clean.mp4 -vf "fps=12,scale=960:-2" -c:v libwebp -q:v 80 frames/%03d.webp
```

- `-g 1` makes every frame a keyframe, so seeking to any scroll position
  decodes instantly. Scrubbing a normal MP4 stutters between keyframes.
- The WebP sequence is the smoother alternative: ten seconds at 12 fps is
  120 frames at 960 px, the same budget as the recipe's frame cache.
  Preload the frames and draw them to canvas.
- Choose clips with continuous, one-direction motion. A loop that returns
  to its start frame scrubs back and forth confusingly.

## Writing the prompt

What the sources agree on:

- **No text in frame.** Headlines stay live HTML, so they stay editable,
  translatable and readable.
- **One subject, one camera move.** A slow orbit, push-in or rise reads
  as intentional and scrubs cleanly.
- **Match the page.** Name the background colour and lighting so the clip
  sits on our paper tone (`#f3f0e8`) without a visible edge.
- **Loopable or directional.** Ask for a seamless loop for the hero, and
  for motion that starts and ends apart for a scrub section.

Example prompts in that shape:

> A single product photograph of a ceramic mug lifts off a warm off-white
> surface and separates into five translucent stacked layers, like an
> exploded diagram, each layer hovering a few centimetres above the last.
> Slow continuous camera orbit from front-left to front-right. Soft studio
> light, muted warm palette, no text, no logos, 16:9.

> Seamless loop. A floating stack of thin translucent glass sheets,
> each tinted slightly differently, drifts and gently rotates over a warm
> off-white background with soft shadows. Calm, precise, editorial product
> film. No text, no people, 16:9.

## The agent's checklist

1.  **Ask first.** Generating spends the plan's video quota, and
    downloading a file needs a person's approval in the browser session.
1.  **Generate.** In `gemini.google.com/videos`, choose the aspect ratio,
    attach a reference photo if the clip should show a real retouch, and
    send the prompt.
1.  **Download** with "Download video", then find the file in the
    browser's downloads folder.
1.  **Clean** with the CLI command above, into the scratch directory.
1.  **Check** the bottom-right corner across the whole clip. Discard any
    clip with a ghost of the mark.
1.  **Encode** for a loop or a scrub, and write the poster and
    placeholder.
1.  **Commit** only the encoded assets, never the raw Gemini download, and
    note the prompt used beside them.

## See also

- [Design research](README.md#video)
- [MotionSites](motionsites.md), for the scrub and loop recipes
- [gemini-watermark-remover on GitHub](https://github.com/GargantuaX/gemini-watermark-remover)
