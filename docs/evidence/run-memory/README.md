# Run memory

Peak resident memory of the server with twenty runs at once, before and after
live-view frames were kept out of its run history
([issue #101](https://github.com/M1KUAPP/astra/issues/101), NFR-4). It is the
figure the service's `--memory` in `.github/workflows/deploy.yml` is set from.

Contents:

1.  [Result](#result)
1.  [Limits](#limits)
1.  [Running it](#running-it)

## Result

September 17, 2026, on a local server: twenty runs started together, each
followed over its event stream the way the page follows it, and each page
reloaded once halfway through. Every run made five model calls of twelve
seconds and sent a frame a second, each frame 840 KB, the largest mean frame
[TRD § Frames](/docs/TRD.md#frames) measured.

| Revision                     | Peak resident | Peak heap | Heap after the runs | Replayed on reload |
| ---------------------------- | ------------- | --------- | ------------------- | ------------------ |
| Before, e641c99              | 1,863 MiB     | 1,584 MiB | 1,402 MiB           | 29 frames, 31 MiB  |
| After, only the latest frame | **679 MiB**   | 368 MiB   | **41 MiB**          | 1 frame, 1.6 MiB   |

The server idled at about 100 MiB resident and 27 MiB of heap. The heap after
the runs is measured once every run has ended, while the registry still holds
all twenty, after a full collection. Before, each finished run kept every
frame it had sent and its upload; after, it keeps its events, its latest
frame, and its snapshot.

## Limits

- **Scripted mode, not the real agent.** The server ran the recorded editor
  and a scripted model, so nothing reached OpenAI or Browserbase. The browsers
  of real runs are at Browserbase, not in this process, but this process
  drives them: each screenshot and each exported file arrives over CDP as
  base64 and is decoded here, and each model call carries a screenshot. None
  of that is in the figures.
- **Screenshots were changed.** The recorded editor returns one frame; the
  script makes every look a new frame of random bytes, so none is skipped and
  none compresses, as a PNG does not.
- **Every viewer read at local speed.** The event stream does not wait for a
  viewer's connection, but a slow one now holds at most one unsent frame in
  this process rather than every frame behind it (#101). No slow viewer is
  in the figures.
- **One upload size.** Every run sent the 1.7 MB sample photograph. FR-1
  allows 20 MB, and a large upload is copied several times on its way in.
- **Every run failed at the layer check.** The recorded PSD has no adjustment
  layer, so each run ended with an unrecoverable error after exporting its
  file. Its PSD is 1.3 MB; a real export is larger.
- **Runs of a minute.** Before the change, memory grew with every frame, so a
  longer run would have peaked higher. After it, a run keeps one frame
  however long it lasts.
- **One pair of measurements, on one machine**: Bun 1.4.2 on macOS, Apple
  silicon. Cloud Run's Linux container counts resident memory its own way.
- **A replay is what arrives in the first quarter second** after reconnecting,
  so a live frame landing in that window counts too.

## Running it

It needs no key and spends nothing. From the repository root:

```sh
bun install --frozen-lockfile
bun run docs/evidence/run-memory/measure.ts --label after
```

The script starts the server in a process of its own, so the clients' memory
is not counted, samples resident memory and heap every 50 ms, and writes
`output/<timestamp>/<label>.json`, which Git ignores. `--runs`, `--step-ms`,
and `--frame-bytes` change the load. The recorded pair is in
[`results/before.json`](/docs/evidence/run-memory/results/before.json), run
from a checkout of e641c99, and
[`results/after.json`](/docs/evidence/run-memory/results/after.json). Sizes in
them are in mebibytes.
