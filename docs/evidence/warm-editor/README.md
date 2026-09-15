# Warm editor session

Button to first frame on the deployed service, with and without an editor
warmed while the instruction was typed
([issue #70](https://github.com/M1KUAPP/astra/issues/70), NFR-3). It is the
number [B2](/docs/TRD.md#decisions-deferred-to-spikes) asked for warming to
move.

## Running it

The script drives the public API exactly as the page does, so it needs no
key: production pays for the runs with its own. From the repository root:

```sh
bun run docs/evidence/warm-editor/measure.ts \
  https://layerhand-732371853772.us-central1.run.app
```

It uploads the image to `/api/uploads`, waits `--type-ms` (8 seconds by
default) as a user would while typing, starts the run with the `uploadId`,
and times the first `frame` event from the moment the run request was sent.
It then repeats the whole thing without an upload, as a second visitor with
no warm session. Each run is cancelled as soon as its first frame arrives,
so the measurement costs a model call or two rather than a whole retouch.
Output is `output/<timestamp>/summary.json`, which Git ignores. The recorded
pair is in
[`results/summary.json`](/docs/evidence/warm-editor/results/summary.json).

## Result

September 15, 2026, against the deployed service, on the B1 input — a
640x480 JPEG.

| Run                       | Button to first frame |
| ------------------------- | --------------------- |
| Warm, editor already open | **1,959 ms**          |
| Cold, no warm session     | **7,378 ms**          |
| Saved                     | **5,419 ms**          |

A warm first frame is inside NFR-3's five-second budget and a cold one is
not, which is what the warm session was built for.

Limits on what this shows:

- **One pair of runs, on one image**, minutes apart, against a service that
  was already serving.
- **It does not explain the 21.3 seconds** B2 measured on September 15. Its
  cold figure here is a third of that, in a later revision and a different
  run; the gap was not chased, because the pair above is the comparison
  warming had to win.
- **Neither run finished.** Each was cancelled at its first frame, before
  its first `step` event, so neither cost more than a model call and neither
  says anything about a whole run.
- **The typing pause is a stand-in.** Eight seconds is roughly how long the
  instruction takes to type; a visitor who pastes one and presses the button
  at once gives the session less time to open.
