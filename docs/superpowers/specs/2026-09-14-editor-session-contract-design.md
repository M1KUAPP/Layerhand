# Editor session contract design

Issue #14 introduces the editor boundary that the agent and browser streams
share. The implementation must match Contract 1 in the TRD and provide a
fixture-backed fake that is useful before a hosted browser exists.

## Goals

- Export the `EditorSession`, `ComputerAction`, `Button`, `Pt`, `Viewport`,
  and `LayerInfo` types exactly as specified in Contract 1.
- Provide a deterministic `FakeEditorSession` that replays recorded frames,
  records action batches, and returns real PNG and layered PSD bytes.
- Ship a default recording based on the verified Photopea round trip from
  issue #13.
- Make the contract test reusable against a future real editor session.
- Type-check the new public boundary in strict mode and test it with Bun.

## Non-goals

- Driving Photopea or a hosted browser.
- Validating uploaded image dimensions, formats, or size limits. Issue #15
  owns input validation.
- Parsing or generating PSD files at runtime. Issue #17 owns structural PSD
  validation.
- Implementing masks, adjustment layers, or naming policy. Issue #16 owns
  the real export behavior.
- Simulating timing, failures, cancellation, or agent behavior.

## Public contract

`src/editor/session.ts` exports the TRD contract without adapter-specific
fields:

```ts
export interface EditorSession {
  readonly id: string
  readonly viewport: Viewport

  open(image: Uint8Array, filename: string): Promise<void>
  screenshot(): Promise<Uint8Array>
  act(actions: ComputerAction[]): Promise<void>
  layers(): Promise<LayerInfo[]>
  exportPsd(): Promise<Uint8Array>
  exportPreview(): Promise<Uint8Array>
  close(): Promise<void>
}
```

`ComputerAction` remains the discriminated union from the TRD, including the
batched `act(actions[])` signature. The fake does not widen or translate the
action schema.

## Fixture-backed fake

`src/editor/fake-editor-session.ts` defines:

```ts
export interface EditorRecording {
  readonly frames: readonly Uint8Array[]
  readonly psd: Uint8Array
  readonly preview: Uint8Array
  readonly layers: readonly LayerInfo[]
}

export class FakeEditorSession implements EditorSession {}

export async function createRecordedFakeEditorSession(): Promise<FakeEditorSession>
```

The constructor receives an id, viewport, and `EditorRecording`. Keeping the
recording injectable lets tests use tiny byte arrays while the default factory
loads the real fixtures.

The concrete fake also exposes read-only inspection getters named
`openedImage`, `openedFilename`, and `actionBatches`. They are absent from
`EditorSession`; they exist only so fake-specific tests and early consumers can
observe what the adapter received. Array and object getters return defensive
copies.

The fake follows these deterministic rules:

1. `open()` marks the session ready and resets the frame cursor. It stores
   defensive copies of the image bytes and filename for fake-specific tests.
1. `screenshot()` returns the next recorded frame. After the last frame it
   keeps returning that frame, matching a paused editor rather than looping.
1. `act()` stores one defensive copy per call, preserving both batch boundaries
   and action order.
1. `layers()`, `exportPsd()`, and `exportPreview()` return defensive copies so
   a consumer cannot mutate later results.
1. Methods that need a document reject before `open()` with
   `Error("Editor session is not open")`. Every operation except another
   `close()` rejects after teardown with `Error("Editor session is closed")`.
1. `close()` is idempotent so teardown can safely run from more than one
   cleanup path.
1. Construction rejects a recording with no frames because such a fake cannot
   satisfy `screenshot()`.

The default factory loads three committed assets from
`src/editor/fixtures/` using `node:fs/promises` and `import.meta.url`:

- `photopea-frame.png` is the verified 1440x900 frame from issue #13.
- `layered-output.psd` is the verified 1,412,711-byte PSD from issue #13.
- `document-preview.png` is the 640x480 flattened composite of that PSD,
  without the editor UI.

The preview was exported once with macOS `sips`; the original frame and PSD
remain byte-for-byte unchanged:

```sh
sips -s format png src/editor/fixtures/layered-output.psd \
  --out src/editor/fixtures/document-preview.png
shasum -a 256 src/editor/fixtures/document-preview.png
```

The committed preview's SHA-256 is:

```text
074d66b09f3d571c6b8a52e60fd60881d62299bc01211ad44596160085d867dd
```

The default layer metadata is `Original photograph` followed by
`Retouched copy`, both visible raster layers. The factory does not parse the
PSD; that deliberate duplication ends when issue #17 adds structural
validation.

## Tests

`test/editor/editor-session.contract.ts` exports a registration helper that
accepts an asynchronous `EditorSession` factory. It runs the same observable
sequence a future real-session test will run:

1. Inspect the id and viewport.
1. Open image bytes with a filename.
1. Request a PNG screenshot.
1. Send a representative ordered action batch.
1. Read the layer metadata.
1. Export PSD and PNG bytes.
1. Close the session.

The contract test checks PNG and PSD magic bytes but does not inspect fake-only
state. A later real implementation registers the same suite with a different
factory.

`test/editor/fake-editor-session.test.ts` covers behavior specific to the fake:

- frames advance and then hold on the final frame;
- action batch boundaries and action order are preserved;
- `open()` records defensive copies of the image and filename;
- returned buffers and layer objects cannot mutate the recording;
- document operations reject outside the open lifecycle;
- `close()` is idempotent; and
- an empty recording is rejected.

Every production behavior is introduced through a failing Bun test first.

## Tooling and files

The change adds `typescript`, `@types/bun`, and an explicit `@types/node`
compatibility pin as development dependencies, plus `test` and `typecheck`
package scripts. A strict, no-emit `tsconfig.json` covers `src/**/*.ts` and
`test/**/*.ts`.

The complete file set is:

```text
package.json
bun.lock
tsconfig.json
src/editor/session.ts
src/editor/fake-editor-session.ts
src/editor/index.ts
src/editor/fixtures/photopea-frame.png
src/editor/fixtures/layered-output.psd
src/editor/fixtures/document-preview.png
test/editor/editor-session.contract.ts
test/editor/fake-editor-session.test.ts
test/editor/recorded-fake-editor-session.test.ts
```

No browser provider, agent loop, server code, or unrelated documentation is
changed.
