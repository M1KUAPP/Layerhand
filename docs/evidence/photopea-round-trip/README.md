# Photopea round-trip

Spike B1 from the [TRD](/docs/TRD.md#decisions-deferred-to-spikes): does an
image posted into Photopea come back out as a layered PSD, end to end? This
folder retains the September 15, 2026 rerun of that probe, which is a
throwaway, not the production editor adapter.

Contents:

1.  [Result](#result)
1.  [Timing definitions](#timing-definitions)
1.  [Photoshop verification](#photoshop-verification)
1.  [Limits](#limits)
1.  [Running it](#running-it)
1.  [Files](#files)
1.  [Digests](#digests)

## Result

The retained tests produced eight passes and no failures. The retained
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
string:layerhand:export:adfb4f0c-44c6-4830-89cd-fbf5787d3174
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
| Ready      | Immediately before outer-page navigation           | First Photopea `done`                   | 1,309 ms |
| Upload     | Immediately before posting JPEG bytes              | First subsequent `done`                 |    33 ms |
| Export     | Immediately before posting the layer/export script | Exact sentinel observed after PSD bytes |   100 ms |
| Round trip | Immediately before posting JPEG bytes              | Exact sentinel observed after PSD bytes |   133 ms |
| Full probe | Before local server and Chrome launch              | After parse, assertions, and screenshot | 2,356 ms |

The local ready and direct round-trip intervals total 1,442 ms, below the
five-second NFR-3 threshold. This does not prove NFR-3: that requirement starts
at the user's button press and includes hosted provisioning, which remains
spike B2.

## Photoshop verification

Adobe Photoshop 2026 version 27.10.0 opened the retained PSD on September
15, 2026. No warning dialog appeared between choosing Open and the rendered
document window. Photoshop reported a 640 by 480 RGB/8 document, and its visible
Layers panel showed `Retouched copy` above `Original photograph`.

The check used the exact PSD whose SHA-256 is listed under
[Digests](#digests). Computer control closed the document without a save
prompt after the observation. The structured record is in
[`results/photoshop-verification.json`](/docs/evidence/photopea-round-trip/results/photoshop-verification.json).

## Limits

The text probe read back `Layerhand` and a layer count of two immediately and
after two seconds. It did not export pixels or capture a screenshot of the text,
so it does not establish that a default font rendered at either time.

## Running it

From the repository root, with Bun and Google Chrome installed:

```sh
bun install --frozen-lockfile
bun test docs/evidence/photopea-round-trip
bun run docs/evidence/photopea-round-trip/probe.ts
bun run docs/evidence/photopea-round-trip/trap-probe.ts
```

The scripts use live Photopea and the Picsum URL recorded in `probe.ts`. A
rerun writes to `output/`, which Git ignores, and leaves `results/` as it
was; live-service, network, and cache differences can change the image bytes
and timings.

Paths in `results/result.json` are relative to this directory. They name
`output/`, where the probe wrote each file; the files moved to `results/`
afterwards.

## Files

- [`probe.ts`](probe.ts) contains the outer-page message listener, JPEG upload,
  Photopea layer script, sentinel wait, PSD export, and `ag-psd` assertions.
- [`protocol.ts`](protocol.ts) selects the last binary message before the exact
  sentinel. [`protocol.test.ts`](protocol.test.ts) covers the valid ordering and
  rejects an absent or wrong sentinel and bytes arriving only after it.
- [`evidence-artifacts.ts`](evidence-artifacts.ts) keeps the input JPEG with
  its digest and records file paths relative to this directory.
  [`evidence-artifacts.test.ts`](evidence-artifacts.test.ts) covers both, and
  checks the retained round-trip timing.
- [`trap-probe.ts`](trap-probe.ts) contains the six trap probes. The captured
  values are in
  [`results/trap-results.json`](/docs/evidence/photopea-round-trip/results/trap-results.json).
- [`results/result.json`](/docs/evidence/photopea-round-trip/results/result.json)
  is the retained round-trip output.
  [`results/input.jpg`](/docs/evidence/photopea-round-trip/results/input.jpg)
  is the exact JPEG used by that run.
  [`results/photopea-round-trip.psd`](/docs/evidence/photopea-round-trip/results/photopea-round-trip.psd)
  is the PSD selected from that message stream.
- [`results/photoshop-verification.json`](/docs/evidence/photopea-round-trip/results/photoshop-verification.json)
  records the manual compatibility observation against the PSD digest.
- [`results/photopea-final.png`](/docs/evidence/photopea-round-trip/results/photopea-final.png)
  is the final Photopea frame. It shows the opened photograph, but not the
  Layers panel and therefore is not used as layer-structure evidence.
- The run used `ag-psd` 30.2.0, Playwright 1.63.0, and Sharp 0.35.4, the
  versions the repository's `bun.lock` resolves.

## Digests

SHA-256 digests identify the retained outputs:

```text
cdced3c5f2e0524af39acb80c96ca8a26254c924ea1514774202091e97d13d11  results/input.jpg
fbf838068cc10c61772907f2147ef9a9cc7afaa9ea17032c410276ca033f8ae7  results/photopea-round-trip.psd
58aed27873edc925f39489161f762bfda2f57d9fe8c28a74b8fadac315c37eef  results/photopea-final.png
18b6250db8b941b82331a02051ab8a00fb0d8d991037f8c4e6130d422ae8bc1b  results/result.json
f86421943cffac4beed618ff1b05f7484c60a23293675ac6aa1d8e843daa1dc2  results/trap-results.json
f42a44b9f1b76b4275b2757e76539ec2088f5001bc60e5c61ce1ae78f040a7e8  results/photoshop-verification.json
```
