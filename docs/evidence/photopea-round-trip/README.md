# Photopea round-trip evidence

This directory retains evidence from the September 14, 2026 spike B1 run.

This is a throwaway probe, not the production editor adapter.

## Contents

- [`probe.ts`](probe.ts) contains the outer-page message listener, JPEG upload,
  Photopea layer script, sentinel wait, PSD export, and `ag-psd` assertions.
- [`protocol.ts`](protocol.ts) selects the last binary message before the exact
  sentinel. [`protocol.test.ts`](protocol.test.ts) covers the valid ordering and
  rejects an absent or wrong sentinel and bytes arriving only after it.
- [`trap-probe.ts`](trap-probe.ts) contains the six trap probes. The captured
  values are in [`output/trap-results.json`](output/trap-results.json).
- [`output/result.json`](output/result.json) is the retained round-trip output.
  [`output/photopea-round-trip.psd`](output/photopea-round-trip.psd) is the PSD
  selected from that message stream.
- [`output/photopea-final.png`](output/photopea-final.png) is the final Photopea
  frame. It shows the opened photograph, but not the Layers panel and therefore
  is not used as layer-structure evidence.
- [`bun.lock`](bun.lock) resolves `ag-psd` 30.2.0, Playwright 1.63.0, and Sharp
  0.35.4.

## Reproduction

From this directory, with Bun and Google Chrome installed:

```sh
bun install --frozen-lockfile
bun test
bun run probe.ts
bun run trap-probe.ts
```

The scripts use live Photopea and the Picsum URL recorded in `probe.ts`. A
rerun creates or replaces files under `output/`; live-service, network, and
cache differences can change the image bytes and timings.

Absolute paths in `result.json` are the original temporary execution paths.
The corresponding retained files are under this directory's `output/` folder.

The retained protocol test produced five passes and no failures. The retained
round-trip run reported a 13,442-byte JPEG, a 1,412,711-byte PSD, the `8BPS`
signature, dimensions of 640 by 480, and these top-level layers:

```text
Original photograph
Retouched copy
```

The captured export sequence was:

```text
string:done
binary:1412711
string:layerhand:export:3364ca3b-b6ad-4b73-8cce-c04e126d6e70
string:done
```

The first `done` was intentionally emitted by the export script. The host
waited for the exact generated sentinel and selected the preceding binary
message, so the spurious completion could not resolve the operation.

## Timing definitions

These are one sample from a newly launched local Chrome process with
Playwright's temporary profile. The probe did not record the Chrome build or
the machine's prior HTTP cache state, so “cold” means a new process and
profile, not a proven network-cold request.

| Interval   | Start                                              | End                                     |   Result |
| ---------- | -------------------------------------------------- | --------------------------------------- | -------: |
| Ready      | Immediately before outer-page navigation           | First Photopea `done`                   | 1,337 ms |
| Upload     | Immediately before posting JPEG bytes              | First subsequent `done`                 |    32 ms |
| Export     | Immediately before posting the layer/export script | Exact sentinel observed after PSD bytes |    66 ms |
| Full probe | Before local server and Chrome launch              | After parse, assertions, and screenshot | 1,890 ms |

The probe did not retain a direct clock from JPEG post to PSD-byte receipt.
Adding the upload and export intervals would omit the unmeasured gap between
them, so no image-in-to-PSD interval is inferred. None of these local clocks is
the NFR-3 button-to-run-start interval; hosted provisioning remains spike B2.

## Digests

SHA-256 digests identify the retained outputs:

```text
dfa50fcac684caf15c945f79c18206f9663611c2a08631db3c101cc867795292  output/photopea-round-trip.psd
58aed27873edc925f39489161f762bfda2f57d9fe8c28a74b8fadac315c37eef  output/photopea-final.png
4d2df467b347d6eea05fcdf08b2389ba2ccf7ae8b2de11f1bb93223d912c2c50  output/result.json
11ff1ea8601f22174c54d63f154465793fc12734cfff3d36febfadb4d6b6dea1  output/trap-results.json
```

## Evidence limits

The exact input JPEG was not retained, so its bytes and digest cannot be
recovered from this bundle. The URL and byte length do not substitute for the
file because a remote response can change.

The text probe read back `Layerhand` and a layer count of two immediately and
after two seconds. It did not export pixels or capture a screenshot of the text,
so it does not establish that a default font rendered at either time.

No durable Photoshop opening record, application build, warning state, or
Layers-panel capture was retained. B1 therefore remains provisional until the
PSD identified above is opened in Photoshop and that observation is added.
