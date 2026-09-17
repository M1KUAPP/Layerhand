# Demo recorder

Records the Layerhand page with Playwright, optionally dubs it with local
text-to-speech and burned-in subtitles, and muxes a 1920x1080 H.264 MP4. Free and
local: no paid API.

Contents:

1.  [Provenance](#provenance)
1.  [Harness structure](#harness-structure)
1.  [What gets filmed, and what it costs](#what-gets-filmed-and-what-it-costs)
1.  [Install](#install)
1.  [Record, dub, and verify](#record-dub-and-verify)
1.  [Tests](#tests)
1.  [Environment configuration](#environment-configuration)
1.  [Technical cautions](#technical-cautions)
1.  [See also](#see-also)

```text
narration.txt ──► speak.py ──► seg/*.wav ──► schedule.py ──┐
                                        └──► subtitles.py ─┤
                                                           ├──► ffmpeg ──► demo.mp4
walk.mjs ──► record.mjs ──► capture.webm ──► assemble.sh ──┘
                         └► beats.json ────────┘
```

- Single source of truth in `lines.json`: narration audio and subtitle
  generation both read `lines.json`. What is spoken and what is displayed
  cannot diverge.
- Beat-keyed timing: narration is anchored to UI beats measured during browser
  recording, not arbitrary static timestamps. If a network call slows down,
  narration follows the picture rather than drifting.
- Optional slides: the normal path captures the live application directly
  without slides. Slide rendering and assembly remain available when needed.

## Provenance

Adapted from the recorder in `TolongLabs/codenection-dev`, which was itself
carried over from `TolongLabs/MakanLah`. It is team tooling, never imported by
`src/`, and nothing in it ships in the container.

| Dimension        | Role                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| What it is       | Build and recording automation harness -- a camera and dubber, not an application feature             |
| Where it runs    | Standalone in `scripts/demo/`, never imported by `src/`                                               |
| Whose it is      | Carried over from team tooling in `TolongLabs/codenection-dev` (originating in `TolongLabs/MakanLah`) |
| What it produces | `demo.mp4` video deliverable; nothing in it ships in the container                                    |

## Harness structure

Two files contain product-specific definitions; the remainder are generic
harness utilities.

| File                | Role                                                                                                                                     | Changes when                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `walk.mjs`          | Films eight beats: landing, input, running, correction, applied, result, layers, end                                                     | App UI, interactions, or flows change |
| `narration.txt`     | Script lines keyed to beat names: `beat \| offset_ms \| text`                                                                            | Walkthrough script changes            |
| `record.mjs`        | Headless browser runner; records `capture.webm` and `beats.json`                                                                         | Rarely (browser launch options)       |
| `contract.mjs`      | Exact required beat sequence and capture-completeness audit                                                                              | When the walkthrough beats change     |
| `warmup.mjs`        | Exports `warmTarget`, which checks `/health` and loads the page off camera and never starts a run                                        | When warmup health checks change      |
| `proof.mjs`         | Refuses a capture whose run ended partial, whose layers have editor-default names such as `Layer 1`, or whose download links are missing | When acceptance criteria change       |
| `motion.mjs`        | Constant-rate camera scrolling with CSS easing suspended                                                                                 | Rarely (motion tuning)                |
| `manifest.py`       | Resolves narrated beats and fails on missing visual moments                                                                              | Never (timing contract)               |
| `speak.py`          | Batch synthesis (Kokoro or reference-cloned Chatterbox)                                                                                  | Rarely (TTS settings)                 |
| `schedule.py`       | Clears speech collisions; rejects lines crossing visual beats                                                                            | Never (scheduling math)               |
| `subtitles.py`      | Generates line-wrapped SRT subtitle cards from `lines.json`                                                                              | Never (subtitle layout rules)         |
| `narrate.sh`        | Orchestrates synthesis, deconfliction, subtitle burn, and MP4 mux                                                                        | Rarely                                |
| `assemble.sh`       | Normalizes capture; optionally stitches slide stills to timeline                                                                         | When slide deck changes               |
| `slides/render.mjs` | Renders HTML slides to PNG with subtitle collision verification                                                                          | Rarely                                |

## What gets filmed, and what it costs

By default `DEMO_WEB` is `http://127.0.0.1:3000`, a local server started in
another terminal, which replays a recorded editor session and spends nothing:

```sh
RUN_MODE=scripted FAKE_RUN_INTERVAL_MS=2500 bun run dev
```

The slower step interval gives the camera time to type its correction before
the scripted run ends. At 2500 ms a capture on September 18 filmed all eight
beats in 48 seconds; the default of a second a step was not tried.

Pointing `DEMO_WEB` at the deployed service films a real agent run: it spends
one of the visitor's three free runs and real model money, so do it
deliberately.

The walk types the instruction
`Remove the background, warm the highlights, clean the reflections.` and the
mid-run correction `Keep the shadow.`

## Install

All browser and audio stack dependencies stay isolated in scratch directories
and virtual environments. Dependencies stay out of `package.json`.

### Playwright in scratch directory

```sh
export DEMO_DIR="${TMPDIR:-/tmp}/layerhand-demo"
mkdir -p "$DEMO_DIR" && cd "$DEMO_DIR"
bun add -d playwright
bunx playwright install chromium   # then record with DEMO_CHANNEL=chromium
```

### Chatterbox TTS for cloned voice (optional)

Chatterbox runs in a dedicated Python 3.11 virtualenv with PyTorch. The pinned
requirements use Chatterbox Nano by default: it is the official CPU-oriented
variant and still supports zero-shot reference-voice cloning.

```sh
export CHATTERBOX_HOME="$HOME/.local/share/layerhand-demo/chatterbox"
mkdir -p "$CHATTERBOX_HOME" && cd "$CHATTERBOX_HOME"
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python \
  -r scripts/demo/chatterbox-requirements.txt

# Reference clip: 10-20 seconds of clean speech from one speaker.
cp /path/to/reference_sample.wav "$CHATTERBOX_HOME/reference.wav"
```

### Kokoro TTS for default synthetic voice

Fast local ONNX synthesis that requires no reference clip:

```sh
export KOKORO_HOME="$HOME/.local/share/layerhand-demo"
mkdir -p "$KOKORO_HOME" && cd "$KOKORO_HOME"
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python kokoro-onnx soundfile
curl -sLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -sLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

### System tools

Ensure `ffmpeg` and `ffprobe` are present on system `PATH`:

```sh
command -v ffmpeg && command -v ffprobe
```

## Record, dub, and verify

### Capture

Records live UI interactions from the running application:

```sh
export DEMO_DIR="${TMPDIR:-/tmp}/layerhand-demo"
export DEMO_WEB="http://127.0.0.1:3000"
export DEMO_CHANNEL=chromium

node scripts/demo/record.mjs
```

`DEMO_CHANNEL=chromium` uses the Chromium that the install step downloaded.
Left unset, the recorder looks for an installed Google Chrome, and fails at
launch on a machine without one.

Outputs `$DEMO_DIR/capture.webm` and `$DEMO_DIR/beats.json`. Review standard
output to confirm every target beat was marked. Before recording starts, the
runner warms `/health` and loads the page off-camera. The runner retries one
transient warm-up failure and refuses to record if the second attempt fails.

### Silent cut

The silent cut, which is what FR-32 asks for, normalizes the capture into
`capture-joined.mp4` with no narration step:

```sh
bash scripts/demo/assemble.sh
```

If `DEMO_SLIDES` is empty or unset, `assemble.sh` normalizes `capture.webm` into
the 1080p canvas `$DEMO_DIR/capture-joined.mp4` without requiring slides.

If pitch slides are needed:

```sh
# Render HTML slides in scripts/demo/slides/ to PNGs and check subtitle collision
export DEMO_SLIDES="arch:12 close:15"
node scripts/demo/slides/render.mjs

# Stitch slides onto the end of capture.webm and extend beats.json
bash scripts/demo/assemble.sh
```

### Narrated cut

Synthesizes audio, runs line deconfliction, generates subtitles, and muxes the
deliverable:

```sh
# Using the default Kokoro synthetic voice:
bash scripts/demo/narrate.sh

# Or using Chatterbox voice cloning and an optional ducked music bed:
DEMO_TTS=chatterbox \
CHATTERBOX_REF=/path/to/reference.wav \
DEMO_BGM=/path/to/background-music.mp3 \
bash scripts/demo/narrate.sh
```

Outputs `$DEMO_DIR/demo.mp4`.

### Deliverable verification

Verify all deliverable invariants before release:

```sh
export DEMO_DIR="${TMPDIR:-/tmp}/layerhand-demo"
DELIVERABLE="$DEMO_DIR/demo.mp4"

# 1. Total runtime must be within the duration window (30 to 120 seconds):
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$DELIVERABLE")
echo "Measured duration: ${DURATION}s"
python3 -c "import sys; d=float(sys.argv[1]); assert 30.0 <= d <= 120.0, f'Runtime {d}s outside 30-120s window'" "$DURATION"

# 2. Dimensions (1920x1080) and video codec (H.264):
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of csv=p=0 "$DELIVERABLE"

# 3. Audio stream present and encoded as AAC:
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels,sample_rate -of csv=p=0 "$DELIVERABLE"

# 4. Audio signal integrity (audible speech, non-silent):
ffmpeg -i "$DELIVERABLE" -af "volumedetect" -vn -sn -dn -f null /dev/null 2>&1 | grep -E "max_volume|mean_volume"

# 5. Burned subtitles track:
head -n 20 "$DEMO_DIR/narration.srt"
```

## Tests

Run the JavaScript unit and contract tests with Node:

```sh
node --test 'scripts/demo/tests/*.test.mjs'
```

`bun test` also runs the `.mjs` tests.

Run the Python audio scheduling and synthesis tests with unittest:

```sh
python3 -m unittest discover -s scripts/demo/tests -p 'test_*.py'
```

## Environment configuration

| Variable             | Default                                    | Description                                                          |
| -------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `DEMO_DIR`           | `${TMPDIR:-/tmp}/layerhand-demo`           | Scratch directory for captures, audio segments, and final MP4        |
| `DEMO_WEB`           | `http://127.0.0.1:3000`                    | Target web URL to film                                               |
| `DEMO_TTS`           | `kokoro` when installed                    | TTS engine (`kokoro` or `chatterbox`)                                |
| `CHATTERBOX_VARIANT` | `nano`                                     | Chatterbox model (`nano`, `turbo`, or `base`)                        |
| `CHATTERBOX_HOME`    | `~/.local/share/layerhand-demo/chatterbox` | Chatterbox virtual environment and model cache                       |
| `CHATTERBOX_REF`     | `$CHATTERBOX_HOME/reference.wav`           | Reference audio sample for voice cloning                             |
| `KOKORO_HOME`        | `~/.local/share/layerhand-demo`            | Kokoro model and voices directory                                    |
| `DEMO_VOICE`         | `jf_nezumi`                                | Kokoro voice ID                                                      |
| `DEMO_SPEED`         | `1.15` Kokoro / `1.0` Chatterbox           | Narration playback speed factor                                      |
| `DEMO_PAD`           | `#F3F0E8`                                  | Pillarbox pad colour matching Layerhand UI background                |
| `DEMO_SLIDES`        | `""`                                       | Optional `name:seconds` pairs for trailing slide stills              |
| `DEMO_OUT`           | `$DEMO_DIR/demo.mp4`                       | Target path of muxed deliverable                                     |
| `DEMO_CHANNEL`       | `chrome`                                   | Browser channel: system `chrome`, or `chromium` for Playwright's own |
| `DEMO_WARMUP`        | `1`                                        | Set `0` to skip the off-camera production warm-up                    |
| `DEMO_BGM`           | `""`                                       | Optional background-music file, looped and ducked under speech       |
| `DEMO_BGM_GAIN_DB`   | `-17`                                      | Music gain before speech-triggered ducking                           |
| `DEMO_MIN_DURATION`  | `30`                                       | Reject a deliverable shorter than this many seconds                  |
| `DEMO_MAX_DURATION`  | `120`                                      | Reject a deliverable longer than this many seconds                   |

## Technical cautions

- **Chatterbox variants**: Nano is the CPU default. `turbo` offers a larger
  model; `base` is retained for compatibility but is impractically slow without
  a GPU on this host. The reference embedding and model are each loaded once
  per script, and content-addressed audio is cached outside the repository.
- **CPU attention trap**: On this host, fused paths in both Nano and the base
  model emit silent all-NaN audio. `speak.py` disables MKL-DNN before every
  Chatterbox import and forces `SDPBackend.MATH`; the base model additionally
  forces eager transformer attention. These settings must remain intact.
- **Perth/setuptools compatibility**: Older Perth builds import `pkg_resources`,
  which setuptools removed. `chatterbox-requirements.txt` pins `setuptools<81`;
  do not loosen that bound without rebuilding and smoke-testing the voice path.
- **16-bit PCM audio format**: All speech segments are written as 16-bit signed
  PCM WAVs. Python's standard `wave` module does not support 32-bit float audio
  and raises `unknown format: 3` if float formats are written.
- **Beat deconfliction**: A visual beat marks when a feature appears, not how
  long the narration line takes to speak. `schedule.py` may move a line only to
  clear prior speech, then fails the render if any line crosses into the next
  visual beat. Retiming the capture is required instead of narrating the wrong
  screen.
- **Pacing and scrolling**: Camera moves use a constant-speed
  `requestAnimationFrame` interpolation from `motion.mjs`; do not restore
  Playwright's snapping `scrollIntoViewIfNeeded`. Beat intervals are floored
  against the measured Chatterbox and default Kokoro lines, while slow page
  work naturally counts toward the interval.
- **16:10 to 16:9 letterboxing**: The browser capture viewport is 1440x900
  (16:10). Rather than cropping content to 16:9, it is scaled to 1728x1080 and
  padded horizontally to 1920x1080 using `DEMO_PAD` (`#F3F0E8`), making
  pillarbox bars blend seamlessly into the Layerhand page background.
- **Subtitle layout rules**: Subtitles use Geist at `FontSize=10.5`,
  `MarginV=10`, and a compact translucent `BorderStyle=3` scrim with
  `Outline=0.75` padding so adjacent backing rows remain separate. Cards wrap
  at 36 characters over at most two rows, and the schedule forbids cue overlap.
- **Slide subtitle clearance**: When slides are rendered via
  `slides/render.mjs`, content must stay above `Y=852` px (`SUBTITLE_TOP`) to
  prevent collision with the bottom subtitle banner.

## See also

- [/docs/PRD.md](/docs/PRD.md): launch requirements; FR-32 specifies the demo
  recording.
- [/docs/TRD.md](/docs/TRD.md): technical requirements and system architecture.
