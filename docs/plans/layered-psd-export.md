# Layered PSD export implementation plan

The task-by-task plan for issue #16: a Photopea editor session that exports a
layered PSD, a PNG preview, and the PSD's own layer tree.

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement issue #16 so a production Photopea editor session returns
one coherent layered PSD, flattened PNG, and recursive, human-named layer tree.

**Architecture:** Keep `EditorSession` as the provider-neutral boundary and
compose its Photopea implementation from the existing loader and bridge, a
pure metadata and naming policy, an export transaction, and an action runner.
One session queue owns lifecycle ordering, while one cached export promise owns
the PSD, preview, and layer tree for a document generation.

**Tech Stack:** Bun, TypeScript, `playwright-core`, Photopea live messaging,
Chrome DevTools Protocol, `ag-psd` 30.2.0, Sharp, Bun tests.

**Spec:** `docs/decisions/0003-parser-backed-photopea-export.md`

## Global constraints

- Photopea is the production editor. Do not generate production PSDs with
  `ag-psd`; use it only to parse exported metadata and build test fixtures.
- Use exactly `ag-psd` 30.2.0 as a production dependency.
- Preserve PSD background-first stack order in public layer trees. Reverse the
  sibling index at every path segment only when addressing Photopea's
  foreground-first live collections.
- Normalize names to NFC, collapse whitespace, trim, and compare with
  locale-independent lowercase strings. Rename every occurrence of a
  document-wide duplicate.
- Reserve all preserved names before assigning deterministic fallback names.
- Treat masks as metadata attached to their layer; never emit a `mask` layer
  kind.
- Treat `realMask` as the pixel mask when present. Otherwise use `mask` only
  when `fromVectorData` is not true. Report `vectorMask` separately.
- A completed tree needs an effectively visible adjustment or an enabled mask
  on an effectively visible layer. Ancestor visibility participates.
- Every export script echoes a unique begin marker. Accept exactly one binary
  payload after it and before the bridge sentinel.
- Validate the full bounded PNG chunk structure, not only its signature.
- Cache both fulfilled and rejected snapshot promises until a new `open()` or
  `act()` generation invalidates them. Never retry an export implicitly.
- A correlation failure poisons the session until `close()`.
- A failed `open()` leaves the session not open. Invalidate before any attempted
  `open()` or `act()` browser work.
- The default `wait` action lasts exactly 1,000 milliseconds.
- Use Playwright for left, right, middle, movement, scrolling, keys, typing, and
  screenshots. Use a narrow CDP seam only for back and forward mouse buttons.
- `close()` closes admission immediately, drains admitted work, detaches CDP,
  and calls the injected browser release exactly once.
- Start every production behavior with a Bun test that fails for the intended
  missing behavior, then write only enough production code to make it pass.
- Do not broaden `EditorSession.open()` beyond JPEG and PNG uploads.
- Do not claim Photoshop, Affinity Photo, or GIMP compatibility in this issue;
  those checks belong to issue #17.

---

### Task 1: Migrate the recursive layer contract

**Files:**

- Create: `src/editor/layer-tree.ts`
- Modify: `src/editor/session.ts`
- Modify: `src/editor/contract.ts`
- Modify: `src/editor/fake-editor-session.ts`
- Modify: `src/editor/index.ts`
- Modify: `src/agent/contract.ts`
- Modify: `src/agent/fake-run.ts`
- Modify: `src/agent/contract-tests.ts`
- Modify: `src/agent/fake-run.test.ts`
- Modify: `src/server/run-registry.ts`
- Modify: `src/web/api.ts`
- Modify: `src/web/app.ts`
- Modify: `src/web/styles.css`
- Modify: `docs/TRD.md`
- Test: `test/editor/session.types.test.ts`
- Test: `test/editor/fake-editor-session.test.ts`
- Test: `test/editor/recorded-fake-editor-session.test.ts`
- Test: `test/editor/editor-session.contract.ts`
- Test: `test/editor/single-layer-editor-session.contract.test.ts`
- Test: `test/server/run-registry.test.ts`
- Test: `test/web/api.test.ts`
- Test: `test/web/state.test.ts`
- Test: `test/web/application.browser.test.ts`

**Interfaces:**

- Consumes: the existing `EditorSession`, `RunResult`, registry snapshots, and
  result-page renderer.
- Produces:

```ts
export type LayerKind = 'raster' | 'adjustment' | 'group'
export type LayerMaskKind = 'pixel' | 'vector'

export interface LayerMaskInfo {
  readonly kind: LayerMaskKind
  readonly enabled: boolean
}

export interface LayerInfo {
  readonly name: string
  readonly kind: LayerKind
  readonly visible: boolean
  readonly masks: readonly LayerMaskInfo[]
  readonly children: readonly LayerInfo[]
}

export function cloneLayerInfo(layer: LayerInfo): LayerInfo
export function cloneLayerTree(layers: readonly LayerInfo[]): LayerInfo[]
```

- [ ] **Step 1: Make the public type test demand the recursive shape**

Replace the `LayerInfo` assertions in `session.types.test.ts` with the exact
shape above, add exact assertions for `LayerKind`, `LayerMaskKind`, and
`LayerMaskInfo`, and assert that `contract.ts` re-exports the same types rather
than declaring a second shape.

```ts
type ExpectedLayerInfo = {
  readonly name: string
  readonly kind: 'raster' | 'adjustment' | 'group'
  readonly visible: boolean
  readonly masks: readonly {
    readonly kind: 'pixel' | 'vector'
    readonly enabled: boolean
  }[]
  readonly children: readonly ExpectedLayerInfo[]
}

type LayerAssertions = [
  Assert<IsExact<LayerKind, ExpectedLayerInfo['kind']>>,
  Assert<IsExact<LayerMaskKind, ExpectedLayerInfo['masks'][number]['kind']>>,
  Assert<IsExact<LayerMaskInfo, ExpectedLayerInfo['masks'][number]>>,
  Assert<IsExact<LayerInfo, ExpectedLayerInfo>>
]
```

- [ ] **Step 2: Run the typecheck and observe RED**

Run: `rtk bun run typecheck`

Expected: fail because `mask` remains a layer kind and `masks` and `children`
do not exist.

- [ ] **Step 3: Add recursive defensive-copy tests**

Use this nested fixture in the fake-session and registry tests:

```ts
const nestedLayers: LayerInfo[] = [
  {
    name: 'Retouching group',
    kind: 'group',
    visible: true,
    masks: [],
    children: [
      {
        name: 'Background isolation',
        kind: 'raster',
        visible: true,
        masks: [{ kind: 'pixel', enabled: true }],
        children: []
      }
    ]
  }
]
```

Mutate the returned child name and mask `enabled` value through a mutable test
cast, then assert a second read still equals `nestedLayers`. In the registry
test, mutate both the caller-owned result after registration and a returned
snapshot before asking for another snapshot.

- [ ] **Step 4: Run the focused runtime tests and observe RED**

Run:
`rtk bun test test/editor/fake-editor-session.test.ts test/server/run-registry.test.ts`

Expected: fail because existing object spreads retain child and mask aliases.

- [ ] **Step 5: Implement the canonical contract and deep clone helper**

Declare the four types only in `session.ts`. Reduce `contract.ts` to:

```ts
export type { LayerInfo, LayerKind, LayerMaskInfo, LayerMaskKind, Viewport } from './session'
```

Implement `layer-tree.ts` as:

```ts
import type { LayerInfo } from './session'

export function cloneLayerInfo(layer: LayerInfo): LayerInfo {
  return {
    name: layer.name,
    kind: layer.kind,
    visible: layer.visible,
    masks: layer.masks.map((mask) => ({ ...mask })),
    children: layer.children.map(cloneLayerInfo)
  }
}

export function cloneLayerTree(layers: readonly LayerInfo[]): LayerInfo[] {
  return layers.map(cloneLayerInfo)
}
```

Use `cloneLayerTree()` in the fake session and registry. Export every canonical
type and both clone helpers from `src/editor/index.ts`.

- [ ] **Step 6: Migrate fake and recorded layer values**

Give every raster and adjustment `masks: []` and `children: []`. Represent the
fake background-removal step as this editable raster instead of a standalone
mask layer:

```ts
{
  name: 'Background isolation',
  kind: 'raster',
  visible: true,
  masks: [{ kind: 'pixel', enabled: true }],
  children: []
}
```

Keep the recorded PSD's two raster entries as historical partial metadata; add
empty masks and children without claiming that it proves issue #16.

- [ ] **Step 7: Add strict recursive decoder tests and observe RED**

In `test/web/api.test.ts`, decode `nestedLayers`, then separately reject:

- a root `kind: 'mask'`;
- an unknown mask kind;
- a non-boolean mask `enabled` value;
- non-array `masks` or `children`;
- a malformed grandchild.

Run: `rtk bun test test/web/api.test.ts`

Expected: fail because the decoder is flat and still accepts `mask` as a layer.

- [ ] **Step 8: Implement strict recursive decoding**

Add a `layerMask()` decoder and make `layer()` recurse:

```ts
function layerMask(value: unknown): LayerMaskInfo {
  const source = record(value)
  const kind = string(source.kind)
  if (kind !== 'pixel' && kind !== 'vector') invalidResponse()
  return { kind, enabled: boolean(source.enabled) }
}

function layer(value: unknown): LayerInfo {
  const source = record(value)
  const kind = string(source.kind)
  if (kind !== 'raster' && kind !== 'adjustment' && kind !== 'group') {
    invalidResponse()
  }
  if (!Array.isArray(source.masks) || !Array.isArray(source.children)) {
    invalidResponse()
  }
  return {
    name: string(source.name),
    kind,
    visible: boolean(source.visible),
    masks: source.masks.map(layerMask),
    children: source.children.map(layer)
  }
}
```

Factor the repeated `RunApiError` construction into a local `invalidResponse()`
that returns `never`.

- [ ] **Step 9: Add recursive result-page tests and observe RED**

Feed `nestedLayers` to the browser result state. Assert the accessible layer
list contains `Retouching group`, `Background isolation`, `group`, `raster`, and
`pixel mask`, and that the child list is nested inside the group list item.

Run: `rtk bun test test/web/application.browser.test.ts`

Expected: fail because only root layers and kinds render.

- [ ] **Step 10: Implement recursive layer rendering**

Add these focused helpers in `app.ts`:

```ts
function renderLayerTree(layers: readonly LayerInfo[]): HTMLOListElement {
  const list = node('ol')
  for (const layer of layers) list.append(renderLayer(layer))
  return list
}

function renderLayer(layer: LayerInfo): HTMLLIElement {
  const item = node('li', 'layer-row')
  const summary = node('div', 'layer-summary')
  summary.append(node('strong', undefined, layer.name), node('span', undefined, layer.kind))
  for (const mask of layer.masks) {
    summary.append(node('span', 'layer-mask', `${mask.enabled ? '' : 'disabled '}${mask.kind} mask`))
  }
  item.append(summary)
  if (layer.children.length > 0) item.append(renderLayerTree(layer.children))
  return item
}
```

Update the result view to call `renderLayerTree()`. Scope existing row-grid CSS
to `.layer-summary`, indent nested lists with one rule, and keep list semantics.

- [ ] **Step 11: Update the TRD contract and all fixtures**

Replace the flat `LayerInfo` snippet in `docs/TRD.md` with the exact Task 1
types. Update agent, state, route, runtime, and contract fixtures to contain
empty `masks` and `children`, using the nested editable fixture where structure
matters.

- [ ] **Step 12: Verify and commit Task 1**

Run:

```bash
rtk bun test src/agent test/editor test/server/run-registry.test.ts test/web
rtk bun run typecheck
rtk bunx prettier --check src test docs/TRD.md
rtk git diff --check
```

Expected: all selected tests pass, typecheck passes, and both formatting checks
report no issues.

Commit:

```bash
rtk git add src/editor src/agent src/server/run-registry.ts src/web \
  test/editor test/server/run-registry.test.ts test/web docs/TRD.md
rtk git commit -m "refactor(editor): model recursive layer trees"
```

### Task 2: Parse exported PSD metadata

**Files:**

- Create: `src/editor/photopea-export-error.ts`
- Create: `src/editor/psd-metadata.ts`
- Create: `test/editor/support/psd-fixtures.ts`
- Create: `test/editor/psd-metadata.test.ts`
- Modify: `src/editor/index.ts`
- Modify: `package.json`
- Modify: `bun.lock`

**Interfaces:**

- Consumes: `LayerInfo`, `LayerMaskInfo`, and `cloneLayerTree()` from Task 1.
- Produces:

```ts
export type AdjustmentType =
  | 'brightness/contrast'
  | 'levels'
  | 'curves'
  | 'exposure'
  | 'vibrance'
  | 'hue/saturation'
  | 'color balance'
  | 'black & white'
  | 'photo filter'
  | 'channel mixer'
  | 'color lookup'
  | 'invert'
  | 'posterize'
  | 'threshold'
  | 'gradient map'
  | 'selective color'

export interface ParsedLayerInfo extends LayerInfo {
  readonly adjustmentType?: AdjustmentType
  readonly children: readonly ParsedLayerInfo[]
}

export interface ParsedPsdMetadata {
  readonly width: number
  readonly height: number
  readonly layers: readonly ParsedLayerInfo[]
}

export type PhotopeaExportErrorCode =
  | 'photopea_no_document'
  | 'photopea_export_response'
  | 'photopea_invalid_psd'
  | 'photopea_invalid_png'
  | 'photopea_layer_tree_changed'
  | 'photopea_invalid_layer_name'

export class PhotopeaExportError extends Error {
  readonly code: PhotopeaExportErrorCode
}

export function parsePsdMetadata(bytes: Uint8Array): ParsedPsdMetadata
export function toLayerInfoTree(layers: readonly ParsedLayerInfo[]): LayerInfo[]
```

- [ ] **Step 1: Add the exact parser dependency**

Run: `rtk bun add --exact ag-psd@30.2.0`

Expected: `package.json` contains `"ag-psd": "30.2.0"` under dependencies and
the root `bun.lock` resolves version 30.2.0.

- [ ] **Step 2: Add fixture builders and parser shape tests**

In `psd-fixtures.ts`, wrap `writePsd()` with raw image-data objects so tests can
create small PSDs without a DOM canvas:

```ts
export function rgba(width: number, height: number, values: readonly number[]) {
  return { width, height, data: Uint8ClampedArray.from(values) }
}

export function psdBytes(psd: Psd): Uint8Array {
  return new Uint8Array(writePsd(psd, { generateThumbnail: false }))
}
```

Write focused tests for:

- a 2-by-1 PSD with a hidden raster and a nested empty group;
- all sixteen `adjustment.type` values and their exact `AdjustmentType` result;
- a pixel `mask`, disabled `realMask`, and disabled `vectorMask` on one layer;
- `mask.fromVectorData: true` with `vectorMask`, which emits only vector;
- a `Uint8Array` view with non-zero `byteOffset`;
- `8BPS` followed by malformed contents;
- a valid PSD with the four skip options and no canvas initialization.

- [ ] **Step 3: Run parser tests and observe RED**

Run: `rtk bun test test/editor/psd-metadata.test.ts`

Expected: fail because `parsePsdMetadata()` and its typed error do not exist.

- [ ] **Step 4: Implement the typed export error**

Use stable names and messages:

```ts
export class PhotopeaExportError extends Error {
  constructor(
    readonly code: PhotopeaExportErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'PhotopeaExportError'
  }
}
```

Parser failures use code `photopea_invalid_psd` and message
`Photopea returned invalid PSD bytes.` without leaking an `ag-psd` exception.

- [ ] **Step 5: Implement metadata parsing**

Call `readPsd()` on an exact copy of the view with:

```ts
{
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
  skipLinkedFilesData: true
}
```

Recursively map children. `children !== undefined` means `group`, even when
empty. Otherwise `adjustment` means `adjustment`; every other leaf is `raster`.
Map visibility as `!hidden`. For masks, select `realMask` before a non-derived
`mask`, then append `vectorMask`; map `disabled` for pixel masks and `disable`
for vector masks.

- [ ] **Step 6: Strip parser-only adjustment metadata**

Implement `toLayerInfoTree()` as a recursive value copy that omits
`adjustmentType` and returns mutable arrays of readonly public values.

- [ ] **Step 7: Verify and commit Task 2**

Run:

```bash
rtk bun test test/editor/psd-metadata.test.ts
rtk bun run typecheck
rtk bunx prettier --check src/editor test/editor package.json
rtk git diff --check
```

Expected: parser tests, typecheck, and formatting pass.

Commit:

```bash
rtk git add package.json bun.lock src/editor test/editor
rtk git commit -m "feat(editor): parse exported PSD layer metadata"
```

### Task 3: Enforce names and completed-tree policy

**Files:**

- Create: `src/editor/layer-names.ts`
- Create: `src/editor/layer-tree-policy.ts`
- Create: `test/editor/layer-names.test.ts`
- Create: `test/editor/layer-tree-policy.test.ts`
- Modify: `src/editor/index.ts`
- Modify: `src/agent/fake-run.ts`
- Modify: `src/agent/fake-run.test.ts`

**Interfaces:**

- Consumes: `LayerInfo`, `ParsedLayerInfo`, `AdjustmentType`, and
  `PhotopeaExportError`.
- Produces:

```ts
export type LayerPath = readonly number[]

export interface LayerRename {
  readonly path: LayerPath
  readonly from: string
  readonly to: string
}

export function normalizeLayerName(name: string): string
export function buildLayerRenamePlan(layers: readonly ParsedLayerInfo[]): readonly LayerRename[]
export function assertLayerNames(layers: readonly LayerInfo[]): void

export type LayerCompletionErrorCode = 'missing_editable_layer'
export class LayerCompletionError extends Error {
  readonly code: LayerCompletionErrorCode
}
export function assertCompleteLayerTree(layers: readonly LayerInfo[]): void
```

- [ ] **Step 1: Add normalization and generic-name table tests**

Test these exact cases:

| Input                                  | Normalized          | Generic                |
| -------------------------------------- | ------------------- | ---------------------- |
| `"  Warm   highlights  "`              | `"Warm highlights"` | no                     |
| decomposed `"Cafe\u0301"`              | `"Café"`            | no                     |
| `"123 — ✓"`                            | unchanged           | yes, no Unicode letter |
| `"Layer"`, `"layer 12"`                | unchanged           | yes                    |
| `"Group"`, `"GROUP 4"`                 | unchanged           | yes                    |
| `"Curves"`, `"curves 3"`               | unchanged           | yes                    |
| `"Curves adjustment"`                  | unchanged           | no                     |
| `"Portrait copy"`, `"Portrait COPY 2"` | unchanged           | yes                    |

Cover the raw default label for every `AdjustmentType`, including labels with
spaces and punctuation.

- [ ] **Step 2: Add deterministic rename-plan tests**

Build a nested parsed tree containing:

- two custom names differing only by case;
- generic rasters before and after a preserved `Retouched pixels`;
- two generic curves adjustments;
- a generic group with a generic child;
- a custom NFC-equivalent duplicate in another group.

Assert every duplicate occurrence is in the plan, preserved names are reserved
before fallbacks, a valid name with extra whitespace receives a
normalization-only rename, suffixes begin at `2`, paths use PSD order, and
calling the planner twice returns equal arrays. Apply the plan in the test and
assert a second plan is empty.

- [ ] **Step 3: Run naming tests and observe RED**

Run: `rtk bun test test/editor/layer-names.test.ts`

Expected: fail because normalization and planning do not exist.

- [ ] **Step 4: Implement normalization and the two-pass planner**

Use `name.normalize('NFC').replace(/\s+/gu, ' ').trim()`. Use Unicode property
escapes for the letter test and `.toLowerCase()` for comparison keys. First
flatten the tree with paths, count normalized keys, and reserve valid unique
names. In a second PSD-order pass, emit a normalization-only rename when a
preserved raw name differs from its normalized value. Rename every generic or
duplicated entry with the first free fallback, then suffix `2`, `3`, and so on.

Adjustment fallbacks use a complete constant record:

```ts
const ADJUSTMENT_LABELS: Readonly<Record<AdjustmentType, string>> = {
  'brightness/contrast': 'Brightness and contrast',
  levels: 'Levels',
  curves: 'Curves',
  exposure: 'Exposure',
  vibrance: 'Vibrance',
  'hue/saturation': 'Hue and saturation',
  'color balance': 'Color balance',
  'black & white': 'Black and white',
  'photo filter': 'Photo filter',
  'channel mixer': 'Channel mixer',
  'color lookup': 'Color lookup',
  invert: 'Invert',
  posterize: 'Posterize',
  threshold: 'Threshold',
  'gradient map': 'Gradient map',
  'selective color': 'Selective color'
}
```

Match raw Photopea defaults through a separate exact record:

```ts
const ADJUSTMENT_DEFAULT_NAMES: Readonly<Record<AdjustmentType, string>> = {
  'brightness/contrast': 'Brightness/Contrast',
  levels: 'Levels',
  curves: 'Curves',
  exposure: 'Exposure',
  vibrance: 'Vibrance',
  'hue/saturation': 'Hue/Saturation',
  'color balance': 'Color Balance',
  'black & white': 'Black & White',
  'photo filter': 'Photo Filter',
  'channel mixer': 'Channel Mixer',
  'color lookup': 'Color Lookup',
  invert: 'Invert',
  posterize: 'Posterize',
  threshold: 'Threshold',
  'gradient map': 'Gradient Map',
  'selective color': 'Selective Color'
}
```

Append ` adjustment` only to the humanized generated label. Raw Photopea
labels, with an optional integer suffix, remain generic; generated names do
not.

- [ ] **Step 5: Add completion-policy tests and observe RED**

Test rejection of an empty tree, all-raster tree, disabled mask, hidden masked
layer, visible adjustment below a hidden group, and invalid duplicate names.
Test acceptance of an enabled pixel mask, enabled vector mask, and an
effectively visible adjustment at two nesting depths.

Run: `rtk bun test test/editor/layer-tree-policy.test.ts`

Expected: fail because `assertCompleteLayerTree()` does not exist.

- [ ] **Step 6: Implement name and completion assertions**

`assertLayerNames()` recursively requires normalized stored names, non-generic
names, and unique lowercase normalized keys. It throws
`PhotopeaExportError('photopea_invalid_layer_name', ...)`.

`assertCompleteLayerTree()` calls `assertLayerNames()` first, then walks with an
`ancestorsVisible` boolean. It succeeds on an effectively visible adjustment or
an enabled mask attached to an effectively visible layer. Otherwise throw
`LayerCompletionError('missing_editable_layer', 'Completed edits require an enabled mask or visible adjustment.')`.

- [ ] **Step 7: Enforce completion in the fake run**

Call `assertCompleteLayerTree(layers)` inside the fake run's `result(true)`
path before constructing a completed result. Do not call it for step-cap or
cancelled partial results. Add one fake-run test that reaches completion and one
that reaches a partial result before the editable layer is added.

- [ ] **Step 8: Verify and commit Task 3**

Run:

```bash
rtk bun test test/editor/layer-names.test.ts \
  test/editor/layer-tree-policy.test.ts src/agent/fake-run.test.ts
rtk bun run typecheck
rtk bunx prettier --check src/editor src/agent test/editor
rtk git diff --check
```

Expected: all focused tests, typecheck, and formatting pass.

Commit:

```bash
rtk git add src/editor src/agent test/editor
rtk git commit -m "feat(editor): enforce layer export policies"
```

### Task 4: Build the correlated Photopea export transaction

**Files:**

- Create: `src/editor/photopea-script.ts`
- Create: `src/editor/export-binary.ts`
- Create: `src/editor/photopea-document-exporter.ts`
- Create: `test/editor/export-binary.test.ts`
- Create: `test/editor/photopea-document-exporter.test.ts`
- Modify: `src/editor/photopea-document-loader.ts`
- Modify: `src/editor/index.ts`

**Interfaces:**

- Consumes: `PhotopeaDocumentBridge`, parsed metadata, rename planning, and
  final-name validation.
- Produces:

```ts
export function photopeaScriptString(value: string): string
export function selectPsdExport(messages: readonly PhotopeaMessage[], beginMarker: string): Uint8Array
export function selectPngExport(messages: readonly PhotopeaMessage[], beginMarker: string): Uint8Array

export interface PhotopeaExportSnapshot {
  readonly psd: Uint8Array
  readonly preview: Uint8Array
  readonly layers: readonly LayerInfo[]
}

export interface PhotopeaDocumentExporterOptions {
  readonly createBeginMarker?: () => string
}

export class PhotopeaDocumentExporter {
  constructor(bridge: PhotopeaDocumentBridge, options?: PhotopeaDocumentExporterOptions)
  nameSourceLayer(): Promise<void>
  exportSnapshot(): Promise<PhotopeaExportSnapshot>
}
```

- [ ] **Step 1: Add binary-selection tests**

Test exact failures for no begin marker, duplicate begin markers, no bytes after
the marker, two byte messages after it, PSD with a wrong signature, and PNG
with: signature only, non-`IHDR` first chunk, non-13-byte `IHDR`, zero width,
out-of-bounds chunk length, no `IEND`, and trailing bytes after `IEND`. Test that
arbitrary text and bytes before one begin marker are ignored.

Use a test helper that emits a valid 1-by-1 PNG chunk sequence. CRC values need
not be recomputed because structural validation does not decode pixels, but all
lengths and the terminal `IEND` must be exact.

- [ ] **Step 2: Run binary tests and observe RED**

Run: `rtk bun test test/editor/export-binary.test.ts`

Expected: fail because the selectors do not exist.

- [ ] **Step 3: Implement correlated binary selection**

Find exactly one text message equal to `beginMarker`, slice strictly after it,
and require exactly one byte message in that slice. Copy accepted bytes before
returning. Use `photopea_export_response` for correlation or cardinality and
the format-specific code for content validation.

For PNG, read unsigned big-endian chunk lengths with `DataView`. Require the
signature, `IHDR` first with length 13 and positive width and height, chunks
whose data and CRC remain in bounds, and `IEND` with zero length at the exact
end of the byte array.

- [ ] **Step 4: Add exporter protocol tests**

Use a memory `PhotopeaDocumentBridge` that records scripts and returns explicit
message arrays. Cover:

- source naming emits and verifies exactly one `Original photograph` result;
- source naming reports `photopea_no_document` for the no-document marker;
- PSD and PNG export report `photopea_no_document` when their script returns
  the no-document marker without bytes;
- candidate PSD with no renames is returned without a second PSD export;
- candidate PSD requiring renames sends one ES3-compatible preflight-and-rename
  script and parses a second final PSD;
- the rename script reverses every sibling path index;
- a mismatch marker throws `photopea_layer_tree_changed` before final export;
- a final invalid or duplicate name throws `photopea_invalid_layer_name`;
- preview export happens only after final naming;
- every PSD and PNG script contains its unique begin marker before
  `Document.saveToOE()`.

- [ ] **Step 5: Run exporter tests and observe RED**

Run: `rtk bun test test/editor/photopea-document-exporter.test.ts`

Expected: fail because the exporter does not exist.

- [ ] **Step 6: Extract the shared script-string helper**

Move the existing JSON, U+2028, and U+2029 escaping logic from the document
loader into `photopea-script.ts`; import it from both loader and exporter.
Re-run `photopea-document-loader.test.ts` before continuing.

- [ ] **Step 7: Implement source naming and export scripts**

Source naming accepts exactly one of:

```text
layerhand:source-named:Original%20photograph
layerhand:no-document
```

Each format script emits its injected begin marker and then calls
`app.activeDocument.saveToOE("psd")` or
`app.activeDocument.saveToOE("png")`. A no-document branch echoes
`layerhand:no-document` after the marker and does not save.

- [ ] **Step 8: Implement whole-tree preflight and rename**

Serialize a recursive expected tree containing normalized name, public kind,
child count, and planned replacement. Generate ES3 syntax only: `var`, function
declarations, classic loops, and string concatenation. The live classifier
returns `group` for `LayerSet` and `adjustment` only for these Photopea
`LayerKind` values:

```text
BLACKANDWHITE, BRIGHTNESSCONTRAST, CHANNELMIXER, COLORBALANCE,
COLORLOOKUP, CURVES, EXPOSURE, GRADIENTMAP, HUESATURATION, INVERSION,
LEVELS, PHOTOFILTER, POSTERIZE, SELECTIVECOLOR, THRESHOLD, VIBRANCE
```

It returns `raster` for every other leaf kind.

At every container, map parsed index `i` to live index
`container.layers.length - 1 - i`. Validate every node before a second pass
applies any rename. Echo exactly one success or mismatch marker. If the rename
plan is empty, skip the script and final PSD export.

- [ ] **Step 9: Assemble and validate the snapshot**

Export and parse the candidate, build the plan, preflight and rename only when
needed, export and parse the final PSD when renamed, call `assertLayerNames()`
on the final public tree, then export PNG. Return copied bytes and the public
tree derived only from the selected final PSD.

- [ ] **Step 10: Verify and commit Task 4**

Run:

```bash
rtk bun test test/editor/export-binary.test.ts \
  test/editor/photopea-document-exporter.test.ts \
  test/editor/photopea-document-loader.test.ts
rtk bun run typecheck
rtk bunx prettier --check src/editor test/editor
rtk git diff --check
```

Expected: all focused tests, typecheck, and formatting pass.

Commit:

```bash
rtk git add src/editor test/editor
rtk git commit -m "feat(editor): export coherent Photopea snapshots"
```

### Task 5: Translate computer actions

**Files:**

- Create: `src/editor/photopea-action-runner.ts`
- Create: `src/editor/playwright-auxiliary-mouse.ts`
- Create: `test/editor/photopea-action-runner.test.ts`
- Create: `test/editor/playwright-auxiliary-mouse.test.ts`
- Modify: `src/editor/index.ts`

**Interfaces:**

- Consumes: `ComputerAction`, Playwright's mouse, keyboard, screenshot, and CDP
  session APIs.
- Produces:

```ts
export type AuxiliaryButton = 'back' | 'forward'

export interface AuxiliaryMouse {
  click(button: AuxiliaryButton, point: Pt, modifiers: readonly string[]): Promise<void>
  close(): Promise<void>
}

export interface PhotopeaActionPage {
  readonly mouse: Pick<Page['mouse'], 'click' | 'down' | 'move' | 'up' | 'wheel'>
  readonly keyboard: Pick<Page['keyboard'], 'down' | 'insertText' | 'press' | 'up'>
  screenshot(options: { readonly fullPage: false; readonly type: 'png' }): Promise<Buffer>
}

export interface PhotopeaActionRunnerOptions {
  readonly delay?: (milliseconds: number) => Promise<void>
}

export class PhotopeaActionRunner {
  constructor(page: PhotopeaActionPage, auxiliaryMouse: AuxiliaryMouse, options?: PhotopeaActionRunnerOptions)
  act(actions: readonly ComputerAction[]): Promise<void>
  screenshot(): Promise<Uint8Array>
  close(): Promise<void>
}

export function createPlaywrightAuxiliaryMouse(page: Page): AuxiliaryMouse
```

- [ ] **Step 1: Add one ordered action transcript test**

Use recording page and auxiliary implementations. Submit all action variants
in one batch and assert this exact semantic order:

- modifier downs precede click, move, drag, and scroll;
- `wheel` click calls `mouse.click(..., { button: 'middle' })`;
- double click uses left button and `clickCount: 2`;
- scroll moves to its point before `mouse.wheel(scroll_x, scroll_y)`;
- drag moves to the first point, presses left, moves through remaining points,
  and releases left;
- empty drag performs no mouse call;
- keypress normalizes aliases and calls one `keyboard.press()` chord;
- type uses `keyboard.insertText()`;
- wait invokes the injected delay with 1,000;
- screenshot action calls a PNG, non-full-page capture and discards it;
- standalone `screenshot()` copies the returned Buffer.

- [ ] **Step 2: Add cleanup-failure tests**

Make the mouse operation reject while SHIFT and ALT are held. Assert ALT then
SHIFT are still released. Make drag movement reject and assert `mouse.up()` is
still called. Call `close()` twice and assert auxiliary close occurs once with
the same rejection observed by both callers.

- [ ] **Step 3: Run action-runner tests and observe RED**

Run: `rtk bun test test/editor/photopea-action-runner.test.ts`

Expected: fail because the action runner does not exist.

- [ ] **Step 4: Implement aliases and action execution**

Normalize these aliases case-insensitively:

```ts
const KEY_ALIASES = {
  SHIFT: 'Shift',
  CTRL: 'Control',
  CONTROL: 'Control',
  ALT: 'Alt',
  CMD: 'Meta',
  COMMAND: 'Meta',
  META: 'Meta',
  ENTER: 'Enter',
  ESC: 'Escape',
  ESCAPE: 'Escape',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ARROWUP: 'ArrowUp',
  ARROWDOWN: 'ArrowDown',
  ARROWLEFT: 'ArrowLeft',
  ARROWRIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGEUP: 'PageUp',
  PAGEDOWN: 'PageDown',
  TAB: 'Tab',
  SPACE: 'Space'
} as const
```

Preserve single printable keys. Implement a `withModifiers()` helper with a
`finally` block that releases keys in reverse order. Give drag its own
`try/finally` after `mouse.down()`.

- [ ] **Step 5: Add CDP transcript tests and observe RED**

Inject a recording CDP session into the internal constructor seam. Assert a
back click emits pressed then released `Input.dispatchMouseEvent` calls with
button `back`, `buttons` 8 then 0, `clickCount` 1, coordinates, and modifier
bitmask Alt=1, Control=2, Meta=4, Shift=8. Assert forward uses `buttons` 16.
Assert `close()` detaches once.

Run: `rtk bun test test/editor/playwright-auxiliary-mouse.test.ts`

Expected: fail because the CDP adapter does not exist.

- [ ] **Step 6: Implement the lazy auxiliary CDP adapter**

Create one CDP session lazily through `page.context().newCDPSession(page)`.
Dispatch pressed and released messages, and attempt the release in `finally` if
pressed succeeds. Retain one close promise and detach only if a session was
created.

- [ ] **Step 7: Verify and commit Task 5**

Run:

```bash
rtk bun test test/editor/photopea-action-runner.test.ts \
  test/editor/playwright-auxiliary-mouse.test.ts
rtk bun run typecheck
rtk bunx prettier --check src/editor test/editor
rtk git diff --check
```

Expected: all focused tests, typecheck, and formatting pass.

Commit:

```bash
rtk git add src/editor test/editor
rtk git commit -m "feat(editor): execute Photopea computer actions"
```

### Task 6: Own the production session lifecycle

**Files:**

- Create: `src/editor/photopea-editor-session.ts`
- Create: `test/editor/photopea-editor-session.test.ts`
- Modify: `src/editor/index.ts`
- Modify: `test/editor/editor-session.contract.ts`

**Interfaces:**

- Consumes: `PhotopeaDocumentLoader`, `PhotopeaDocumentExporter`,
  `PhotopeaActionRunner`, `PlaywrightPhotopeaTransport`, and `PhotopeaBridge`.
- Produces:

```ts
export interface PhotopeaEditorSessionDependencies {
  readonly id: string
  readonly viewport: Viewport
  readonly loader: Pick<PhotopeaDocumentLoader, 'open'>
  readonly exporter: Pick<PhotopeaDocumentExporter, 'nameSourceLayer' | 'exportSnapshot'>
  readonly actions: Pick<PhotopeaActionRunner, 'act' | 'screenshot' | 'close'>
  readonly release: () => Promise<void>
}

export class PhotopeaEditorSession implements EditorSession {
  constructor(dependencies: PhotopeaEditorSessionDependencies)
}

export interface CreatePhotopeaEditorSessionOptions {
  readonly id: string
  readonly hostUrl: string
  readonly viewport?: Viewport
  readonly release: () => Promise<void>
  readonly commandTimeoutMs?: number
  readonly delay?: (milliseconds: number) => Promise<void>
}

export function createPhotopeaEditorSession(
  page: Page,
  options: CreatePhotopeaEditorSessionOptions
): PhotopeaEditorSession
```

- [ ] **Step 1: Add lifecycle and open tests**

Test that document operations reject before open; open calls loader then source
naming; successful open enables operations; a failed load or source-name step
leaves the session not open; and any attempted open clears a retained snapshot
before its dependency begins. Verify byte and filename inputs are copied before
queue admission.

- [ ] **Step 2: Add queue and close tests**

Use deferred promises to prove:

- overlapping open, action, screenshot, and snapshot dependencies execute in
  submission order;
- separate session instances are not serialized together;
- close immediately rejects later admissions but waits for all earlier ones;
- action-runner close finishes before browser release begins;
- release executes once;
- concurrent and repeated close callers observe one retained resolve or reject.

- [ ] **Step 3: Add snapshot tests**

Test that concurrent `layers()`, `exportPsd()`, and `exportPreview()` calls use
one exporter promise; returned trees and bytes are deep defensive copies;
screenshot preserves the cache; an attempted action invalidates before the
action dependency begins; rejected snapshot promises stay cached; and
`photopea_export_response` poisons later document operations until close.

- [ ] **Step 4: Run session tests and observe RED**

Run: `rtk bun test test/editor/photopea-editor-session.test.ts`

Expected: fail because the production session does not exist.

- [ ] **Step 5: Implement one admission queue and document state**

Copy caller inputs synchronously. Reject new calls after close admission or
poisoning. Chain admitted closures from one tail promise using success and
failure continuations so a rejected operation does not stall later admitted
cleanup. Evaluate `idle` versus `open` inside the queued operation, allowing an
`act()` submitted immediately after `open()` to observe the completed open.

- [ ] **Step 6: Implement lazy snapshot ownership**

Retain the exact queued snapshot promise in a field. Each result method captures
that promise and maps it to a deep copy. Invalidation sets the field to
undefined synchronously before submitting open or action work. Never clear the
field from a snapshot rejection handler. Mark the session poisoned only when
the retained rejection is a `PhotopeaExportError` with code
`photopea_export_response`.

- [ ] **Step 7: Implement the close barrier**

Set the admission flag before reading the queue tail. Retain one close promise
that awaits the captured tail, action-runner close, and release in that order.
Use `try/finally` so release still runs if draining or CDP cleanup rejects, while
preserving the first failure for every close caller.

- [ ] **Step 8: Compose the production factory**

Create transport → bridge → loader/exporter and auxiliary mouse → action runner,
then construct the session with the transport viewport. Pass the exact timeout
and delay overrides to their owning components. The factory must not launch or
own Chrome; the injected release callback retains provider responsibility.

- [ ] **Step 9: Strengthen the reusable contract**

Make `editor-session.contract.ts` recursively assert every layer has a
non-empty name, valid masks, and child arrays. Keep signature assertions but do
not demand a completed-tree editable layer because recorded/partial sessions
are valid contract implementations.

- [ ] **Step 10: Verify and commit Task 6**

Run:

```bash
rtk bun test test/editor/photopea-editor-session.test.ts test/editor
rtk bun run typecheck
rtk bunx prettier --check src/editor test/editor
rtk git diff --check
```

Expected: all editor tests, typecheck, and formatting pass.

Commit:

```bash
rtk git add src/editor test/editor
rtk git commit -m "feat(editor): add production Photopea session"
```

### Task 7: Prove masked export in installed Chrome

**Files:**

- Create: `test/editor/photopea-editor-session.integration.test.ts`
- Modify: `test/editor/support/psd-fixtures.ts`
- Modify: `test/editor/editor-session.contract.ts`

**Interfaces:**

- Consumes: the production components from Tasks 2 through 6 and the existing
  installed-Chrome host/test conventions.
- Produces: a gated integration test proving real Photopea export, recursive
  metadata, editable mask preservation, reopenability, and changed flattened
  pixels after a GUI action.

- [ ] **Step 1: Build the deterministic masked fixture in test support**

Use `ag-psd.writePsd()` only in test support to create a 64-by-64 red raster
named `Masked subject` with one enabled pixel mask. The mask is white except for
a black 32-by-32 center square. Parse the generated bytes in the helper and
assert that the mask exists before returning them.

- [ ] **Step 2: Write the gated installed-Chrome test**

Follow the existing integration convention: skip unless
`LAYERHAND_CHROME_INTEGRATION=1`, serve `createPhotopeaHostHtml()` from an
ephemeral `Bun.serve()`, locate installed Chrome, and launch with Playwright.
Use a 1440-by-900 viewport.

Open a valid PNG through `PhotopeaEditorSession.open()` so the production
lifecycle is established, then use the same production bridge to open the
masked PSD as the active Photopea document. Export the snapshot and assert:

- PSD signature and structurally valid PNG;
- a `Masked subject` raster with one enabled pixel mask;
- `assertCompleteLayerTree()` succeeds;
- reopening the exported PSD through the bridge produces the same layer tree.

Target the visible mask thumbnail in the fixed Layers panel with a production
`click` action, then use a production `keypress` action for `CTRL+I`. Export a
new preview and use Sharp to compare raw RGBA pixels. Assert at least one pixel
changes and that the center-versus-edge transparency relationship reverses.

- [ ] **Step 3: Run the test and observe RED**

Run:
`rtk env LAYERHAND_CHROME_INTEGRATION=1 bun test test/editor/photopea-editor-session.integration.test.ts --timeout 120000`

Expected: fail at the earliest missing or incorrect production export,
reopen, mask targeting, or pixel assertion. If the fixed mask-thumbnail point
is wrong, inspect one screenshot, record the corrected 1440-by-900 coordinate
as a named test constant, and re-run RED before changing production code.

- [ ] **Step 4: Fix only integration defects through TDD**

For each production defect revealed by Step 3, first reduce it to a focused
failing unit regression in the owning Task 2–6 test file. Observe that RED,
make the minimum production change, observe the unit test GREEN, and then rerun
the installed-Chrome test. Coordinate calibration remains test data and must
not introduce a scripted Photopea mutation.

- [ ] **Step 5: Run full verification**

Run:

```bash
rtk bun test
rtk bun run typecheck
rtk bun run lint
rtk env LAYERHAND_CHROME_INTEGRATION=1 bun test \
  test/editor/photopea-editor-session.integration.test.ts --timeout 120000
rtk git diff --check
```

Expected: the full suite passes with only the repository's intentional skips,
typecheck and lint pass, the installed-Chrome proof passes, and diff check is
silent.

- [ ] **Step 6: Commit Task 7**

```bash
rtk git add src/editor test/editor
rtk git commit -m "test(editor): prove masked Photopea export"
```

## Issue #17 parallel boundary

The following issue #17 preparation is independent enough for a separate
worktree after this plan is underway: add `bun test` and typecheck to CI, define
an evidence record keyed by PSD SHA-256 and application version, and add pure
digest/path utilities. Do not create the canonical compatibility fixture or
claim any editor compatibility until Task 7 produces the real issue #16 export.

Actual Photoshop, Affinity Photo, and GIMP observations remain sequential after
issue #16. Photoshop is used only for that explicit compatibility check;
Photopea remains the production editor.
