# Driving mechanism evidence

The harness for spike A0 ([issue #2](https://github.com/M1KUAPP/astra/issues/2)):
does GPT-6 Astra drive Photopea more reliably through the `computer` tool or
through code execution? It is a throwaway like the
[B1 probe](/docs/evidence/photopea-round-trip/README.md), not the production
editor adapter.

**No result is recorded here yet.** The harness needs `OPENAI_API_KEY`, and
none was available when it was built. The only runs so far are dry runs with
the scripted model, which check the harness and measure nothing about Astra.

## What a run does

Each mechanism gets the same three-edit instruction, in
[`harness.ts`](harness.ts), on the same three images: the web sample photo
(1536x1024 PNG), the B1 input (640x480 JPEG), and the editor fixture preview
(640x480 PNG).

A run goes through the real pieces: `runAgent()` with `managedAgentRun()`,
the `ResponsesModel` adapter, and [`PhotopeaPageSession`](photopea-page-session.ts),
which opens live Photopea in local Chromium through
`PlaywrightPhotopeaTransport`. The step cap is 40 and the spend cap $8.

- **`computer`** sends `{ "type": "computer" }`. The loop carries out the
  returned `actions[]` through Playwright's mouse and keyboard.
- **`code`** sends a strict `run_code` function tool.
  [`code-runner.ts`](code-runner.ts) runs the model's JavaScript with the
  Playwright `page` in scope and returns its logs with the next screenshot.

For each run the harness records:

- the [#31 run-log line](/docs/TRD.md#observability): steps, tokens in and
  out, cost, cache hit rate, duration, and outcome;
- silent steps, which it counts and fills in so the loop does not stop on a
  missing narration;
- safety checks it acknowledged;
- the layers in the exported PSD;
- every `run_code` call's code, then its logs and error, in `code.ndjson`.

A run counts as completed when it finished its edit and the PSD holds at
least four layers, two of them adjustment layers. The model's code has the
Playwright `page`, so it could reach Photopea's scripting interface through
`page.evaluate` despite the prompt. A run whose code mentions `postMessage`,
`__layerhand`, or `echoToOE` is marked disqualified in `summary.md` and never
counts as completed, because it did not drive the GUI.

## Running it

Install the repository root first, because the harness takes
`playwright-core` from there. Then, from this directory, with a Playwright
Chromium installed:

```sh
(cd ../../.. && bun install --frozen-lockfile)
bun install --frozen-lockfile
OPENAI_API_KEY=... bun run harness.ts
bun run harness.ts --dry-run --mechanism computer
```

`--mechanism computer|code|both` and `--step-cap` narrow a run, and image
paths given as arguments replace the defaults. Output goes to
`output/<timestamp>/`: `runs.ndjson`, `records.json`, `summary.md`, and each
run's frames, PSD, preview, and `code.ndjson`.

Model-written code runs unsandboxed in the harness process, so the harness
takes the key out of the environment before any run starts. Run it only
locally, with a key you can revoke.

## Findings from building it

- Exported files are slow to leave the page. `PlaywrightPhotopeaTransport`
  receives bytes as a JSON array of numbers. That took 7.5 seconds for the
  B1 image's 0.9 MB PSD, and 62 seconds for the sample photo's 9.1 MB PSD.
  The session allows five minutes per command and reuses one export for both
  the file and its layer list. Uploads already avoid this by sending base64.
- A dry run of the sample photo with the default 60-second command timeout
  failed at export for exactly that reason.
- With five minutes allowed, a dry run on all three images went through the
  loop, the live editor, export, and the run-log line. Each run finished its
  scripted four steps, in 86, 12, and 13 seconds. All three counted as not
  completed, which is correct: the scripted model only clicks the canvas, so
  each PSD held one `Background` layer.
