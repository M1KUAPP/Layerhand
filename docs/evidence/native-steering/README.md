# Native steering

One live run with native mid-turn steering
([issue #9](https://github.com/M1KUAPP/astra/issues/9), spike A3). GPT-6
Astra drove Photopea through a Responses API WebSocket, in a Browserbase
browser that loaded `/photopea-host` from the deployed service, and a
correction was sent into the response being generated.

Contents:

1.  [Result](#result)
1.  [Limits](#limits)
1.  [Running it](#running-it)

## Result

The run was on September 15, 2026, against the deployed service. The image
was the B1 input, a 640x480 JPEG, with spike A0's three-edit instruction.
The step cap was 40 and the spend cap $5.

| Measure                          | Value                               |
| -------------------------------- | ----------------------------------- |
| Outcome                          | Complete, finished by the agent     |
| Steps                            | 16                                  |
| Wall clock                       | 192.7 s                             |
| Cost                             | $0.50: 188,259 tokens in, 1,789 out |
| Input read from the prompt cache | 89.5%                               |
| Browserbase session created      | 0.8 s after the run started         |
| Frames to the page               | 25                                  |
| Errors, recoverable or not       | None                                |

### The correction, and what the socket saw

The correction was **"Keep the vignette very subtle, and leave the middle of
the photograph untouched."** It was sent after step 3, while a response was
being generated, and the page was told 1 ms later (FR-21).

| Time      | What happened                                                                            |
| --------- | ---------------------------------------------------------------------------------------- |
| 49,471 ms | `response.created` for the response the correction went into                             |
| 49,494 ms | The correction was sent as `response.steer`                                              |
| 49,495 ms | `correction_ack` reached the page                                                        |
| 49,689 ms | `response.steer.accepted`, 194 ms after sending                                          |
| 51,913 ms | That response ended `response.incomplete`, reason `steered`                              |
| 52,206 ms | The successor's `response.created`, 293 ms later                                         |
| 54,789 ms | The successor's step: "I'll use restrained warmth and keep the vignette off the middle." |

The ledger settled it as **applied: 1, indeterminate: 0**, so the correction
was delivered natively and never replayed at the step boundary. That is the
[acceptance condition](https://github.com/M1KUAPP/astra/issues/9#issuecomment-5676547870)
for the implementation, on a real connection.

### Completed work survived the correction

Steps 1 to 3 created the brightness adjustment, before the correction. The
exported file still has it, alongside the two layers made afterwards:

- `Original photograph`, raster;
- `Brighten the photograph`, an adjustment layer with a mask;
- `Warm the colours`, an adjustment layer with a mask;
- `Very subtle corner vignette`, raster.

The vignette's name, and the 10% opacity the model chose at step 9, are the
correction landing in the work rather than in a restart.

## Limits

- **One run, on one image**, with **one correction**. It is not the
  ten-image measure NFR-1 asks for.
- **The pending and disconnect paths were not exercised live.** This run
  steered a response that had not yet called the computer tool, so the
  server interrupted it rather than queueing the steer for a continuation.
  Both other paths are covered by tests against a scripted server.
- **The correction came from the script**, not from a person typing into
  the page. The page's own path is the same `handle.steer`.
- **The PSD was not opened in Photoshop.**

## Running it

Use Bun 1.4.2, the version production runs; Bun 1.3.14 cannot open
Playwright's CDP connection. The script needs `OPENAI_API_KEY` and
`BROWSERBASE_API_KEY`. From the repository root:

```sh
bun install --frozen-lockfile
bun --env-file=.env run docs/evidence/native-steering/live-steer.ts \
  https://layerhand-732371853772.us-central1.run.app --steer-after 3
```

It composes the same pieces as `liveAgentRun`, holding the model itself so
that it can report what the ledger settled. Output goes to
`output/<timestamp>/`, which Git ignores. The recorded run's files are kept
in [`results/`](/docs/evidence/native-steering/results/):

- `summary.json`;
- `steering.ndjson`, one line per event the socket saw;
- `events.ndjson`, with each frame reduced to a counter;
- `preview.png` and `last-frame.png`.

The script also writes `result.psd` and `first-frame.png`, which are not
kept, and the session's live-view URL, which is not kept anywhere because
it carries a token for that session.
