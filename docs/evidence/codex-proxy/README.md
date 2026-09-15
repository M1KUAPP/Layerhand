# Codex proxy run

A **feasibility hint** for spike A1 and the day-2 gate: can GPT-6 Astra get a
layered three-edit retouch done in live Photopea by writing Playwright code?
It ran on a ChatGPT Plus Codex subscription because no OpenAI API key was
available ([issue #2](https://github.com/M1KUAPP/astra/issues/2)).

**This is not spike A0 data.** Codex's own agent, prompt, and tool loop do
the driving, not `ResponsesModel`. The `computer` tool is not exercised, and
the step, token, and credit figures are not what the product's loop would
record.

Contents:

1.  [How it runs](#how-it-runs)
1.  [Running it](#running-it)
1.  [Results](#results)

## How it runs

- [`helper.ts`](helper.ts) opens one image in live Photopea in local headless
  Chromium, using [`PhotopeaPageSession`](photopea-page-session.ts). It
  exposes three endpoints on `127.0.0.1`:
  - `POST /run` takes a JavaScript body. It runs through the harness's
    `pageCodeRunner`, which refuses page calls once a step ends, and returns
    the logs and a screenshot path.
  - `GET /screenshot` saves the current view and returns its path.
  - `POST /export` saves the PSD and preview and returns the layers.

  Every call's code and result is kept in `code.ndjson`, and `/run` stops
  accepting calls after 60.

- [`run.ts`](run.ts) starts the helper and runs
  `codex exec -m gpt-6-astra --json` at low reasoning effort, sandboxed to
  `workspace-write` with local network access. It tells Codex to drive the
  editor only through `/run` with `page.mouse` and `page.keyboard`, and to
  look at each screenshot before choosing its next step.
- The run is stopped once 150 credits are gone, or after 20 minutes. Credits
  are counted two ways, and whichever is higher counts:
  - the fall in the balance Codex reports with each turn;
  - an estimate from the token counts at Codex's published Astra rates (250,
    25, and 1,250 credits per million input, cached, and output tokens).

  The estimate matters because the plan's included usage is spent before the
  balance moves.

- A run counts as completed only if all of these hold:
  - Codex finished on its own;
  - the exported PSD holds at least four layers, two of them adjustment
    layers;
  - no `/run` code mentions `postMessage`, `__layerhand`, `echoToOE`,
    `saveToOE`, or `app.`.

## Running it

From the repository root, `bun install --frozen-lockfile`. Then, from
`docs/evidence/driving-mechanism`, `bun install --frozen-lockfile`. With
Codex CLI 0.153.0 or newer, signed in:

```sh
cd docs/evidence/codex-proxy
bun run run.ts [image] --cap 150 --minutes 20 --effort low
```

Output goes to `output/<timestamp>-<image>/`: `summary.json`, `code.ndjson`,
`codex-events.ndjson`, `prompt.txt`, every step's screenshot, and
`result.psd`.

## Results

Run on September 15, 2026, with Codex CLI 0.154.0 on `gpt-6-astra` at low
reasoning effort, one image at a time. All three runs completed. Each run's
`summary.json`, `code.ndjson`, final message, and last editor screenshot are in
[`results/`](/docs/evidence/codex-proxy/results/). The
identical prompt is in
[`results/prompt.txt`](/docs/evidence/codex-proxy/results/prompt.txt).

| Image                               | Minutes | `/run` calls | Layers exported | Credits at list rates | Completed |
| ----------------------------------- | ------- | ------------ | --------------- | --------------------- | --------- |
| B1 input, 640x480 JPEG              | 2.9     | 9            | 4, 2 adjustment | 29.4                  | Yes       |
| Web sample photo, 1536x1024 PNG     | 4.9     | 13           | 4, 2 adjustment | 35.8                  | Yes       |
| Editor fixture preview, 640x480 PNG | 4.7     | 19           | 4, 2 adjustment | 51.4                  | Yes       |

- **Layers.** Every run exported `Background`, then a Brightness adjustment
  layer, a warming adjustment layer, and a vignette raster layer, named in
  plain words, for example `Brighten photograph`, `Warm colours`, and
  `Soft dark corners`.
- **How it drove.** All 41 `/run` calls used only `page.mouse` and
  `page.keyboard`. None used `evaluate`, frames, `postMessage`, or any other
  scripting route, and none failed. Codex viewed a screenshot after every
  step.
- **Visible effect.**
  - In runs 2 and 3, the warmer tone and darker corners are plain in the
    exported previews.
  - In run 1 they are faint: the brightness adjustment is small, and the
    vignette layer sits at 22% opacity.
- **Cost.** About 117 credits at Codex's list rates across the three runs.
  The credit balance did not move (1,805.11 before and after), because the
  plan's included usage covered all of it. The five-hour window went from
  5% to 52%, and the weekly window from 44% to 51%.

Limits on what this shows:

- **Two scenes, not three.** The B1 input and the editor fixture preview
  are the same seascape, at the same size. Only the product photo is a
  different scene.
- **Not A0 data.**
  - Codex's own agent and prompt did the driving, not `ResponsesModel`.
  - Its context carries the user's installed skills.
  - The `computer` tool was not tested.
  - Its steps and tokens are not what the product's loop would record.
- **Completion is judged structurally.** It means the named layers exist,
  plus a visual look at the previews. No retoucher reviewed the results, and
  the files were not opened in Photoshop.
- **Run 1's live usage count read nothing.** `codex exec --json` carries no
  usage, so the 150-credit stop was not active during that run. Its figures
  come from the Codex session log instead, and are kept in
  [`usage-recovered.json`](/docs/evidence/codex-proxy/results/1-input-jpg/usage-recovered.json).
  Runs 2 and 3 read that log live, so their stop was active.

What it suggests, as a hint only: Astra, writing mouse-and-keyboard
Playwright code against live Photopea, can complete the three-edit layered
retouch unattended, in under five minutes and 20 steps. That is the
day-2 gate's question. The measured answer still needs the harness with an
API key.
