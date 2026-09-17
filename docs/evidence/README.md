# Evidence

The measurements and live runs behind the TRD, each kept with the scripts that
produced them. Each folder holds the evidence for one spike or requirement, and
its README gives the result, how to run it again, and any known limits.

## Folders

- [Photopea round-trip](/docs/evidence/photopea-round-trip/README.md) — spike
  B1: an image posted into Photopea comes back out as a layered PSD.
- [Photopea production export](/docs/evidence/photopea-production-export/README.md)
  — the PSD the production export path made, which the default test suite
  parses.
- [Photoshop agent export](/docs/evidence/photoshop-agent-export/README.md) —
  issue #98: real agent exports opened and edited in Photoshop before and
  after the launch freeze.
- [Driving mechanism](/docs/evidence/driving-mechanism/README.md) — spike A0:
  the `computer` tool against code execution, on three images.
- [Codex proxy run](/docs/evidence/codex-proxy/README.md) — a feasibility hint
  for spike A1, with Codex driving Photopea.
- [Agent run](/docs/evidence/agent-run/README.md) — spike B2: one live run of
  the real agent in a Browserbase browser.
- [Native steering](/docs/evidence/native-steering/README.md) — spike A3: a
  correction steered into a live response.
- [Warm editor session](/docs/evidence/warm-editor/README.md) — NFR-3: button
  to first frame, with and without a warmed editor.
- [Run memory](/docs/evidence/run-memory/README.md) — NFR-4: the server's peak
  memory with twenty runs at once, before and after frames left its history.

## Layout

Each folder has the same shape:

- `README.md`, with the result, any limits, and how to run it again;
- the scripts that produced the evidence, run from the repository root with
  its install;
- `results/`, the files kept from the recorded runs;
- `output/`, where a rerun writes, which Git ignores.

Photopea production export is the exception: the test suite reads its PSD from
`src/editor/fixtures/`, and its script is in `scripts/`.
