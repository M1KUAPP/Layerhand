# Agent run

One live run of the real agent behind `RUN_MODE=agent`
([issue #66](https://github.com/M1KUAPP/astra/issues/66)). It runs
`liveAgentRun`, unchanged, with the real Browserbase client and GPT-6 Astra on
the `computer` tool. Browserbase's browser loaded `/photopea-host` from the
deployed service, as `PUBLIC_URL` gives it.

## Running it

Use Bun 1.4.2, the version production runs. The script needs
`OPENAI_API_KEY` and `BROWSERBASE_API_KEY`. From the repository root:

```sh
bun --env-file=.env run docs/evidence/agent-run/live-run.ts \
  https://layerhand-732371853772.us-central1.run.app
```

Bun 1.3.14 cannot run it. There, Playwright's `connectOverCDP` never opens
its WebSocket to Browserbase. Under Bun 1.4.2 and under Node it connects in
about two seconds.

Output goes to `output/<timestamp>/`, which Git ignores. The recorded run's
files are kept in [`results/`](/docs/evidence/agent-run/results/):

- `summary.json`;
- `events.ndjson`, with each frame reduced to a counter;
- `preview.png` and `last-frame.png`.

The script also writes `result.psd` and `first-frame.png`, which are not
kept.

## Result

The run was on September 15, 2026. The image was the B1 input, a 640x480
JPEG, with spike A0's three-edit instruction. The step cap was 40, and the
spend cap $8.

| Measure                          | Value                                   |
| -------------------------------- | --------------------------------------- |
| Outcome                          | Complete, finished by the agent         |
| Steps                            | 19                                      |
| Wall clock                       | 243.5 s                                 |
| Cost                             | $0.85: 369,211 tokens in, 1,693 out     |
| Input read from the prompt cache | 91%                                     |
| Browserbase session created      | 0.8 s after the run started             |
| First frame of the opened image  | 21.3 s                                  |
| First step                       | 24.6 s                                  |
| Browserbase session afterwards   | Released at 243.5 s, reported COMPLETED |

The exported layers, in plain words and each with its own purpose:

- `Original photograph`;
- `Brighten photograph` and `Warm colours`, adjustment layers with masks;
- `Darken corners softly`, a masked raster layer at 28% opacity.

The run reported no errors, recoverable or otherwise.

Limits on what this shows:

- **One run, on one image.** It is not the ten-image measure NFR-1 asks
  for.
- **The effect is faint.** The brightening is gentle, and the vignette sits
  at 28% opacity.
- **It cost more than A0.** A0's `computer` runs took 12 to 13 steps and
  $0.52 each. This run took 19 steps, several of them spent renaming layers.
- **The cold start is not broken down.** A separate probe put the CDP
  connection at about two seconds after the session was created. Most of
  the remaining 18 seconds is therefore Photopea starting and opening the
  image in the Browserbase browser, which took 1.4 seconds locally in B1.
- **The PSD was not opened in Photoshop.**
- **Photopea's advertising panel shows in every frame** (spike B0).
