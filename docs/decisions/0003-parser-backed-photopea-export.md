# ADR-0003: Export a parser-backed Photopea snapshot

## Status

Accepted on September 15, 2026.

## Context

Layerhand must return a layered PSD, a flattened PNG preview, and a layer tree
that describes the PSD itself. Every PSD layer needs a human-readable name, and
a completed result needs at least one editable mask or adjustment. These are
FR-25 through FR-29 and the product's main differentiator.

Issue #14 defined `EditorSession`, but its flat `LayerInfo[]` cannot represent
nested groups or masks attached to layers. Issue #15 can open an image in
Photopea, but no production session yet implements computer actions,
screenshots, layer inspection, export, or teardown.

Photopea can inspect and rename layers and send PSD or PNG bytes to the outer
host. Those operations are explicitly on the scripted side of the boundary in
the TRD. Creating masks, choosing adjustments, and judging the edit remain
GUI-driven retouching decisions.

The three result methods are separate calls. Without coordination, `layers()`,
`exportPsd()`, and `exportPreview()` could observe different document states or
return metadata maintained separately from the file.

## Decision

Implement a Playwright-backed `PhotopeaEditorSession` that composes the existing
transport, bridge, and document loader. It owns one serialized operation queue
and one lazily created export snapshot. The browser provider still creates the
page; the session receives an asynchronous release callback and calls it exactly
once from idempotent `close()`.

### Layer contract

Replace the flat mask-as-layer representation with the actual PSD relationships:

```ts
type LayerKind = 'raster' | 'adjustment' | 'group'
type LayerMaskKind = 'pixel' | 'vector'

interface LayerMaskInfo {
  readonly kind: LayerMaskKind
  readonly enabled: boolean
}

interface LayerInfo {
  readonly name: string
  readonly kind: LayerKind
  readonly visible: boolean
  readonly masks: readonly LayerMaskInfo[]
  readonly children: readonly LayerInfo[]
}
```

The root array and every `children` array preserve PSD stack order. A group owns
its children. Pixel and vector masks stay attached to their owning layer, so an
adjustment layer with a mask does not have to pretend to be only one of them.
Any non-group, non-adjustment leaf is reported as `raster`; Layerhand does not
need separate text, shape, or smart-object kinds for issue #16.

The shared agent and web contracts use this one definition. The fake run,
browser decoder, and layer-list rendering change with it rather than keeping a
second flat type.

### Coherent export snapshot

The first call to `layers()`, `exportPsd()`, or `exportPreview()` creates an
`ExportSnapshot` containing PSD bytes, PNG bytes, and the parsed layer tree.
Later result calls return defensive copies of that snapshot. A successful
`open()` or any attempted `act()` invalidates it; invalidation happens before
actions run because a partly executed batch may already have changed the
document.

The session queue prevents `open()`, `act()`, export, and `close()` from
interleaving. Screenshots use the same lifecycle checks but do not invalidate a
snapshot because they do not mutate the document.

Each export uses `Document.saveToOE()` through `PhotopeaBridge.runScript()` and
therefore inherits the bridge's unique sentinel, timeout, and message ordering.
The session accepts exactly one binary payload with the expected signature:
`8BPS` for PSD and the eight-byte PNG signature for the preview. Generic
`"done"` messages remain irrelevant.

Parse PSD metadata with `ag-psd`, skipping layer pixels, the composite image,
the thumbnail, and linked-file data. `layers()` is derived only from the final
PSD bytes. It never trusts a parallel Photopea DOM response or fixture metadata.

### Naming policy

Code is authoritative for names. As part of `open()`, after the loader verifies
the new document, use the allowed naming-script exception to name the imported
source layer `Original photograph`. The call resolves only after that name is
verified. This records the source role before GUI edits add, move, duplicate,
or delete layers; normalization does not invent a replacement when that layer
no longer exists.

Before the final snapshot, export a candidate PSD and parse its tree. Preserve
names that contain at least one Unicode letter and are neither Photopea defaults
nor document-wide duplicates after normalized, case-insensitive comparison.
Collapse and trim whitespace. Treat empty names, `Layer`, `Layer <number>`,
`Group`, `Group <number>`, parsed adjustment-type defaults, and names ending in
`copy` or `copy <number>` as generic. Match all generic patterns
case-insensitively.

Build a deterministic rename plan from the parsed tree:

- other generic raster layers become `Retouched pixels`;
- generic adjustment layers use their parsed adjustment type, such as
  `Curves adjustment`;
- generic groups become `Retouching group`;
- repeated fallback names receive stable numeric suffixes.

Apply the plan in Photopea by tree-index path with an ES3-compatible script.
Abort if the live tree no longer matches the candidate paths. Export and parse
the final PSD again, then require every final name to pass the policy and be
unique case-insensitively. The PNG preview is exported only after naming is
final. Names do not change pixels, but this ordering makes every result describe
one final document state.

### Completed and partial results

Provide a pure `assertCompleteLayerTree()` policy that requires valid names and
at least one effectively visible adjustment or one enabled mask on an
effectively visible layer anywhere in the recursive tree. A layer is
effectively visible only when it and every ancestor group are visible. The
agent loop must pass this check before reporting `complete: true`.

The export methods do not apply that completion check. Cancellation and the step
cap must still return whatever editable work exists, so a partial PSD without a
mask or adjustment remains exportable and is reported with `complete: false`.
The session never creates a neutral mask or adjustment to satisfy policy; doing
so would move a retouching decision onto the scripted side of the boundary.

### Computer actions and lifecycle

Map every `ComputerAction` to the injected Playwright page in array order.
Clicks, movement, drags, scrolling, keypresses, and typing use Playwright's
mouse and keyboard primitives. `wait` uses the session's injected delay, and
`screenshot` captures and discards an intermediate frame because the contract's
separate `screenshot()` call returns the frame consumed by the agent loop.

`screenshot()` returns a PNG of the configured viewport. `close()` rejects new
work, waits for the current queued operation, clears retained snapshots, and
invokes the injected release callback once. Provider creation, CDP credentials,
and hosted-session policy remain issue #18.

## Errors

Keep existing upload and Photopea protocol errors unchanged. Add typed export
errors for a missing document, an unexpected or ambiguous binary response,
invalid PSD or PNG bytes, a layer tree that changed during naming, and a final
name that still violates policy. Add a separate typed completion-policy error
for a finished tree without an enabled mask or visible adjustment.

No export error triggers an automatic retry. A late first export and a retry can
consume messages from different commands, just as retrying upload can open a
document twice.

## Alternatives considered

### Keep the flat `LayerInfo[]`

This changes fewer consumers, but it cannot distinguish an adjustment with a
mask from a standalone mask entry and cannot reproduce nested groups. It does
not satisfy the requirement that `layers()` describe the exported file's
structure.

### Read the Photopea DOM without parsing the PSD

This avoids a parser dependency and a candidate export. It can still drift from
the serialized bytes, which makes the layer list another claim rather than
evidence about the delivered artifact.

### Generate the PSD with `ag-psd`

This would make structure deterministic but bypass Photopea as the production
editor. It is the documented fallback, not the Layerhand product, and would
remove the visible GUI work the project exists to demonstrate.

## Consequences

- PSD bytes, preview bytes, and layer metadata describe one serialized state.
- The public layer contract becomes recursive and models masks accurately.
- Human layer names no longer depend on the model remembering to clean them up.
- Completed-output policy remains strict without sacrificing partial exports.
- A metadata-only PSD parser becomes a production dependency.
- A generic-name correction can require two PSD exports, but only the final
  bytes are retained or returned.
- Session-level serialization favors correctness over concurrent operations on
  one document; separate browser sessions remain independent.

Revisit this decision if Photopea adds one correlated export message containing
bytes and a complete layer tree, if `ag-psd` cannot parse a Photopea feature the
agent needs, or if the product adds direct human control that can mutate the
document during snapshot creation.

## Verification plan

- Unit-test recursive PSD parsing, mask attachment, stack order, visibility,
  adjustment detection, and malformed inputs.
- Unit-test name preservation, every generic-name rule, duplicate handling,
  deterministic fallbacks, and a live-tree mismatch.
- Run the reusable `EditorSession` contract against the production session with
  injected browser dependencies.
- Test snapshot reuse, defensive copies, invalidation after actions, operation
  ordering, export signatures, error codes, and idempotent release.
- Update agent, server, and browser decoding tests for the recursive contract.
- In installed Chrome, export and reopen a known masked Photopea document,
  change the mask, and prove the flattened PNG pixels change.
- Keep Photoshop, Affinity Photo, and GIMP compatibility checks in issue #17.

Every implementation behavior begins with a failing Bun test. Before the branch
is complete, run `bun test`, `bun run typecheck`, `bun run lint`, the installed-
Chrome integration, and `git diff --check`.

## References

- [ADR-0001: Define a provider-neutral editor session](0001-editor-session-contract.md)
- [ADR-0002: Upload images through an injected Photopea transport](0002-photopea-upload-transport.md)
- [TRD: The editor adapter](/docs/TRD.md#the-editor-adapter)
- [PRD: Output requirements](/docs/PRD.md#output)
- [GitHub issue #16](https://github.com/M1KUAPP/astra/issues/16)
- [GitHub issue #17](https://github.com/M1KUAPP/astra/issues/17)
- [Photopea live messaging](https://www.photopea.com/api/live)
