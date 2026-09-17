# Photoshop agent export

Issue [#98](https://github.com/M1KUAPP/astra/issues/98) asks whether a real
Layerhand export opens without warning and retains editable masks and
adjustments in a desktop editor. This folder records the Photoshop-only check
requested for launch.

Contents:

1.  [Result](#result)
1.  [Method](#method)
1.  [Files](#files)
1.  [Limits](#limits)
1.  [Digests](#digests)

## Result

Adobe Photoshop 2026 version 27.10.0 opened both exports without an error or
warning dialog. Each document was a 640 by 480 RGB/8 PSD with six visible
top-level layers: the original, sharpening, three adjustment layers with pixel
masks, and a masked vignette.

| Export                         | Source commit | Agent result         | Photoshop result                                     |
| ------------------------------ | ------------- | -------------------- | ---------------------------------------------------- |
| September 16 acceptance export | `54ba352`     | Complete in 30 steps | Opened without warning; adjustment and mask editable |
| Frozen deployed build          | `e419b7d`     | Complete in 32 steps | Opened without warning; adjustment and mask editable |

In both files, changing the brightness adjustment from `6` to `40` visibly
brightened the image. Translating the `Soft corner vignette` pixel mask to the
right visibly moved the mask and changed the rendered vignette. The test edits
were discarded when each disposable copy closed.

The frozen export came from
[workflow run 35244658116](https://github.com/M1KUAPP/astra/actions/runs/35244658116),
which exercised the deployed service at commit `e419b7d`. Its acceptance
profile passed with a complete outcome, 32 steps, and a 94.49% prompt-cache hit
rate.

## Method

1.  Download the agent-loop artifact from the workflow run.
1.  Copy `result.psd` to a normal user directory so macOS grants Photoshop
    access through its file chooser.
1.  Open the PSD in Photoshop and observe any warning before the document
    window appears.
1.  Capture the Layers panel.
1.  Open the brightness adjustment properties and change `6` to `40`.
1.  Select the vignette pixel mask, use Free Transform, and translate it to the
    right.
1.  Capture both visible edits, then close without saving.

The same procedure was run first against the September 16 acceptance artifact
and then repeated against the frozen deployed build on September 18, 2026.

## Files

- [`results/verification.json`](results/verification.json) records app, build,
  artifact, layer, warning, and edit observations.
- [`results/baseline-layers-open.jpeg`](results/baseline-layers-open.jpeg)
  shows the older six-layer export immediately after opening.
- [`results/baseline-adjustment-changed.jpeg`](results/baseline-adjustment-changed.jpeg)
  shows the older export with brightness set to `40`.
- [`results/baseline-mask-moved.jpeg`](results/baseline-mask-moved.jpeg) shows
  the older export after translating the vignette mask.
- [`results/frozen-layers-open.jpeg`](results/frozen-layers-open.jpeg) shows the
  frozen build's six-layer export immediately after opening.
- [`results/frozen-adjustment-changed.jpeg`](results/frozen-adjustment-changed.jpeg)
  shows the frozen export with brightness set to `40`.
- [`results/frozen-mask-moved.jpeg`](results/frozen-mask-moved.jpeg) shows the
  frozen export after translating the vignette mask.

## Limits

At the requester's direction, this launch check covers Photoshop only. Affinity
Photo and GIMP were not installed on the test machine and were not tested.
Consequently, this evidence establishes the Photoshop portion of FR-25 and
FR-27; it does not establish cross-editor compatibility.

The PSD files are identified by digest but are not retained here. The frozen
file remains available in the workflow artifact while GitHub retains that
artifact.

## Digests

```text
dc5739ba575c914cf14390268c0f45e444863e9c522226393b6aaeb423021780  baseline result.psd
3780d240f920bbc01d0b1fe71bdf4ac977f1c1ae4042c80a110daf6c1fa69e6c  frozen result.psd
8c21d5d5cee7ab89c1714f355a9f2de34b8c768949bf41ac1b9f923f3734a40d  results/baseline-adjustment-changed.jpeg
9fd54eeb568d660e9d3e5ddeda9af24a810d9f81d4ca6ad0ae696f3d1d507f71  results/baseline-layers-open.jpeg
b3ff065c6abb818abadc1dc4e035c6c6a9db538b5638999723ba8157fd3f34e4  results/baseline-mask-moved.jpeg
a99848f8bd75e02922debaf3ede385b3c4e6cce521016066922120dbc4ae7483  results/frozen-adjustment-changed.jpeg
1eb6e5663722a73ca3971ae705f51795f40263433f9b4a4d59cae78031efe124  results/frozen-layers-open.jpeg
debbbdfcf94b08ef7ed524e9697a0c3bd2c735ad6d47e10c641308b3d5223a89  results/frozen-mask-moved.jpeg
```
