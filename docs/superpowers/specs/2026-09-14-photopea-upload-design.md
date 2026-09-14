# Photopea upload design

## Status

Approved in chat on September 14, 2026. This design implements issue #15,
`feat(editor): open an uploaded image in the editor`.

The current-behavior sections include the Chrome proof and September 14–15
review corrections. The approval date records the original design decision.

## Context

Layerhand edits photographs in Photopea. Photoshop is not the production
editor; it is one of the compatibility readers used later by issue #17.

Issue #14 introduced Contract 1 and a deterministic fake. Issue #15 is the
first production-facing piece behind that contract: validate an uploaded image,
open it in Photopea through Google Chrome, and leave the editor in a predictable
state. Browser creation and hosted-session disposal remain issue #18. Layer
naming and export remain issue #16.

Photopea's supported live-messaging API accepts scripts as strings and files as
`ArrayBuffer` values. The issue #13 spike also proved that the generic `"done"`
message is not a safe script terminator, so every script call uses a unique
`app.echoToOE()` sentinel.

## Goals

- Accept valid JPEG and PNG uploads no larger than 20 MiB and 6000 pixels on
  the long edge.
- Reject unsupported formats, malformed inspected headers, and input-limit
  violations before browser navigation, with a stable reason code and message.
- Open the original bytes in Photopea without downsampling them.
- Verify the resulting Photopea document rather than assuming that a message
  was successful.
- Initialize Photopea in a deterministic English-language layout, then fit
  each opened document to the viewport and select the Move tool.
- Exercise the production path against installed Google Chrome and record the
  observed load time.
- Keep browser-provider creation outside the adapter so issue #18 can connect
  a hosted Chrome page without replacing this code.

## Non-goals

- Implement a complete real `EditorSession` before its remaining operations
  exist.
- Create or dispose Browserbase sessions.
- Implement layer naming, layer inspection, PSD export, or PNG export.
- Drive retouching decisions through scripts.
- Add an HTTP upload endpoint or web interface.
- Use Photoshop to open the source image.

## Chosen approach

Use `playwright-core` with an injected Playwright `Page`. Local integration
tests launch the installed Google Chrome channel. A later Browserbase adapter
can supply a page obtained over CDP to the same transport.

This is preferred to raw CDP because Playwright already normalizes page,
keyboard, iframe, and navigation behavior. It is preferred to computer-use-only
automation because the production protocol needs deterministic waits and
repeatable tests. Computer use remains the final visual verification tool.

## Component boundaries

### Image upload validation

`src/editor/image-upload.ts` owns the input boundary.

```ts
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_IMAGE_EDGE = 6000

export type ImageFormat = 'jpeg' | 'png'

export type ImageUploadErrorCode =
  'unsupported_image_format' | 'image_too_large' | 'malformed_image' | 'image_dimensions_too_large'

export class ImageUploadError extends Error {
  readonly code: ImageUploadErrorCode
}

export interface ValidatedImageUpload {
  readonly bytes: Uint8Array
  readonly filename: string
  readonly format: ImageFormat
  readonly width: number
  readonly height: number
}

export function validateImageUpload(bytes: Uint8Array, filename: string): ValidatedImageUpload
```

Validation uses bytes, never the filename or a supplied content type:

1. Detect PNG or JPEG magic bytes.
2. Check the actual byte length against `MAX_IMAGE_BYTES`.
3. Read displayed dimensions from the header, including JPEG EXIF
   orientation, without decoding the full image.
4. Reject a zero dimension or malformed segment structure.
5. Check the long edge against `MAX_IMAGE_EDGE`.

PNG validation requires the eight-byte signature, a complete first `IHDR`
chunk, legal bit-depth/color-type combinations, compression and filter method
zero, and interlace method zero or one. JPEG validation scans bounded marker
segments before the first scan or end marker. It requires a supported
start-of-frame marker and checks precision for that frame type, component
count, distinct component IDs, sampling factors, and quantization-table
selectors.

For EXIF APP1 segments, the validator bounds the TIFF header and IFD0 table
to that segment and reads only the orientation tag: one inline `SHORT` with
a value from 1 through 8. Both TIFF byte orders are supported. Orientations
5–8 swap the SOF width and height; absent orientation retains the SOF
dimensions. Non-EXIF APP1 segments are ignored. Malformed inspected TIFF or
orientation fields and duplicate orientation tags or segments are rejected
with `malformed_image`; the validator does not guess which one Photopea uses.
It does not follow thumbnail or unrelated EXIF offsets.

The returned bytes are an unchanged defensive copy. Orientation changes
only the expected displayed dimensions, not the pixel data or long-edge
limit.

This is a header-only boundary. It does not verify PNG CRCs, decode pixels,
or validate data after the inspected header. A complete header followed by
truncated or corrupt pixel data can still reach Photopea and fail there.

Messages are stable and user-facing:

| Code                         | Message                                    |
| ---------------------------- | ------------------------------------------ |
| `unsupported_image_format`   | Only JPEG and PNG images are supported.    |
| `image_too_large`            | Image exceeds the 20 MB limit.             |
| `malformed_image`            | Image data is malformed.                   |
| `image_dimensions_too_large` | Image dimensions exceed the 6000 px limit. |

### Photopea transport

`src/editor/photopea-transport.ts` defines a provider-neutral message surface.

```ts
export type PhotopeaMessage =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'bytes'; readonly value: Uint8Array }

export interface PhotopeaTransport {
  readonly viewport: Viewport
  boot(configuration: PhotopeaConfiguration): Promise<void>
  send(message: string | Uint8Array): Promise<void>
  nextMessage(timeoutMs: number): Promise<PhotopeaMessage>
  press(key: string): Promise<void>
  reload(): Promise<void>
}
```

`src/editor/playwright-photopea-transport.ts` implements this interface for
an injected Playwright `Page` and a non-opaque outer-host URL. It does not
launch or own the browser.

The transport applies its configured viewport to the injected page before
navigation, defaulting to 1440x900. Each transport `boot()` initializes a fresh
host document. A same-document navigation returns no response in Playwright,
so the transport reloads in that case to replace the old message queue.

The outer host accepts messages only from its Photopea iframe and the
`https://www.photopea.com` origin. Binary inputs are copied into a fresh
`ArrayBuffer` before `postMessage`. Incoming binary values are also copied.

`src/editor/photopea-host.ts` exports the small outer-environment HTML used by
the transport. Tests serve it from `http://127.0.0.1`; the application can serve
the same HTML later. An opaque `about:blank` parent is forbidden because issue
#13 proved that it can break Photopea startup.

### Sentinelled bridge

`src/editor/photopea-bridge.ts` owns readiness and script correlation.

```ts
export interface PhotopeaBridgeOptions {
  readonly commandTimeoutMs?: number
  readonly createSentinel?: () => string
}

export class PhotopeaBridge {
  constructor(transport: PhotopeaTransport, options?: PhotopeaBridgeOptions)

  boot(): Promise<void>
  openFile(bytes: Uint8Array): Promise<void>
  runScript(script: string): Promise<readonly PhotopeaMessage[]>
  press(key: string): Promise<void>
}
```

`boot()` supplies the fixed Photopea configuration and waits for the first
ready `"done"` from the fresh host. Concurrent callers share that queued
readiness wait. After success, later calls complete without navigation or
reading another message; a failed attempt permits a fresh transport boot.
Readiness uses the same queue as file and script commands.

`openFile()` sends one file followed by an ES3 sentinel script and waits for
that exact sentinel, ignoring generic `"done"` messages.
`runScript()` follows the same rule, returns messages received before its
sentinel, and never allows overlapping commands. `press()` delegates a keyboard
shortcut to the injected transport.

On a readiness or command timeout, the bridge reloads the outer page once and
throws `PhotopeaProtocolError` with code `photopea_timeout`. It does not resend
the file automatically, because a late first request plus a retry could open the
document twice. A command timeout also invalidates cached readiness.

`commandTimeoutMs` is an absolute budget for each readiness or sentinel
message wait. It starts after navigation or message delivery and excludes
awaited reload cleanup. The caller owns limits on those operations; this
option is not a deadline for the whole bridge call.

### Document loader

`src/editor/photopea-document-loader.ts` composes validation and the bridge.

```ts
export interface LoadedPhotopeaDocument {
  readonly filename: string
  readonly format: ImageFormat
  readonly width: number
  readonly height: number
  readonly loadMs: number
}

export class PhotopeaDocumentLoader {
  constructor(bridge: PhotopeaBridge, options?: { readonly now?: () => number })

  open(bytes: Uint8Array, filename: string): Promise<LoadedPhotopeaDocument>
}
```

`open()` validates before calling `bridge.boot()`. It then:

1. Ensures the configured Photopea frame is ready, reusing a successful boot.
2. Reads and validates the current document count through an ES3 script.
3. Sends the validated bytes.
4. Runs an ES3 verification script that requires exactly one additional
   document. It selects the newly appended document, sets a display stem in
   `Document.name` and the full filename in `Document.source`, calls
   `app.UI.fitTheArea()`, and echoes dimensions and the encoded source.
5. Compares the echoed dimensions and source with the validated input.
6. Presses `v` through Chrome to select the Move tool after metadata matches.
7. Returns the measured time from byte send through Move-tool selection,
   excluding boot and the document-count snapshot.

If decoding produces no new document, or more than one, the loader rejects
before changing a document's name or source. The successful file sentinel
alone does not prove a decode succeeded. Chrome verification established
that new documents append to `app.documents` and can be selected through
that collection; Photopea document wrappers do not support object-identity
comparison. The caller must serialize complete open workflows and avoid
concurrent document creation or removal while a load is in progress.

Photopea truncates `Document.name` at the first period; `Document.source`
preserves the complete filename for verification. Reused opens retain the
existing workspace and other documents. Initial panel configuration applies
at boot; fitting and Move-tool selection apply to every successful open.

The loader throws `PhotopeaDocumentError` with code
`photopea_document_mismatch` when read-back differs. It never returns a document
that was merely assumed to have opened.

## Deterministic Photopea environment

The bridge configuration is fixed in code:

```json
{
  "environment": {
    "theme": 0,
    "lang": "en",
    "vmode": 0,
    "intro": false,
    "localsave": false,
    "eparams": {
      "guides": false,
      "grid": false,
      "paths": false,
      "pgrid": false
    },
    "panels": [2, 5, 18]
  }
}
```

The panel IDs are Layers, Properties, and Adjustments. The full toolbar remains
available; hiding tools now would constrain later retouching work without
helping issue #15.

## Data flow

```text
upload bytes
    |
    v
validate magic, length, header fields, and dimensions
    |
    v
ensure outer host and Photopea iframe are ready in Chrome
    |
    v
read and validate the pre-upload document count
    |
    v
post copied ArrayBuffer and wait for completion
    |
    v
require one new document and select it from the collection
    |
    v
set display name and source, fit, echo metadata with unique sentinel
    |
    v
compare metadata, then select Move tool
    |
    v
return LoadedPhotopeaDocument and timing
```

No input-validation failure reaches Chrome. No image is downsampled. The
validated dimensions describe the source document as displayed after JPEG
EXIF orientation, while `viewport` remains the 1440x900 browser coordinate
space from Contract 1.

## Error handling

- Validation errors are deterministic and have stable codes and messages.
- Each readiness or sentinel message wait has an absolute timeout budget.
- A timeout reloads the frame once for cleanup, then reports failure.
- Unexpected binary data during open is ignored until the expected text
  completion or sentinel; it is retained only within the current command.
- A malformed verification response is a protocol failure.
- A document metadata mismatch is a hard failure.
- The caller owns browser teardown. This avoids crossing into issue #18.

## Testing

### Unit tests

`test/editor/image-upload.test.ts` covers:

- PNG and JPEG magic-byte detection.
- Exact 20 MiB acceptance and one-byte-over rejection.
- Exact 6000 px acceptance and 6001 px rejection.
- Truncated PNG chunks, truncated JPEG segments, zero dimensions, and missing
  JPEG start-of-frame markers.
- Legal PNG field combinations and JPEG frame precision/component fields.
- Stable error codes and messages.
- Defensive byte copying.

`test/editor/image-upload-exif.test.ts` covers all eight orientations in both
TIFF byte orders, offset views and IFD locations, absent metadata, unrelated
APP1 segments, malformed fields and bounds, duplicate orientation metadata,
and the unchanged long-edge limit and source bytes.

`test/editor/photopea-bridge.test.ts` uses an in-memory transport and covers:

- The fixed boot configuration.
- File-byte copying.
- Ignoring misleading `"done"` messages before an exact sentinel.
- Command serialization.
- Concurrent boot coalescing, successful reuse, and failed-boot retries.
- Timeout reload without automatic resend.

`test/editor/photopea-document-loader.test.ts` covers:

- Validation occurs before bridge boot.
- The verification script is ES3-compatible.
- Filename escaping.
- Dimension and filename read-back.
- Fit-to-area and Move-tool normalization.
- Deterministic load-time measurement.
- Metadata mismatch and malformed response failures.
- A failed decode cannot rename an existing document or return it as success.

### Google Chrome integration test

`test/editor/photopea-document-loader.integration.test.ts` is opt-in through
`LAYERHAND_CHROME_INTEGRATION=1`. It uses `playwright-core` with
`channel: 'chrome'`, serves the outer host on `127.0.0.1`, and opens real JPEG
and PNG bytes in the public Photopea editor.

Same-page coverage also rejects a truncated second PNG without renaming the
first document, then successfully opens another valid image on that loader.
All eight EXIF orientations are checked against Photopea's displayed
dimensions using real JPEGs with raw SOF dimensions of 32x16.

The integration harness creates boundary fixtures at runtime rather than
committing tens of megabytes. Unit tests prove the exact byte and dimension
limits; the live test opens both formats, including a 6000-pixel long-edge
fixture, and records the load time for a 20 MiB valid container. The committed
test remains skipped in ordinary CI until a Chrome-enabled job is added.

`test/editor/playwright-photopea-transport.integration.test.ts` uses the same
opt-in flag with an in-memory HTTP host in installed Chrome. It verifies the
injected viewport, fresh host initialization on repeated transport boots, and
rejection of stale readiness from timeout cleanup.

The implementation task runs this integration test locally and records the
observed timings in `docs/TRD.md`. A final visible Chrome inspection confirms
the known panel layout, fitted canvas, and Move tool selection.

## Dependencies

- Add `playwright-core` as a runtime dependency because the hosted-browser
  implementation will reuse its `Page` and CDP support.
- Keep boundary-fixture generation in test utilities. Do not add an image
  decoding dependency to production; production reads only the headers.

## Security and scope

- The outer host filters message source and origin.
- File format is derived from bytes, not user-controlled metadata.
- Filenames are escaped before entering an ES3 script.
- Only adapter-owned scripts run through this bridge.
- Retouching choices remain GUI-driven, preserving Layerhand's premise.
- Network allow-listing and CDP credential isolation remain issue #18.

## Acceptance mapping

| Issue #15 criterion                      | Evidence                        |
| ---------------------------------------- | ------------------------------- |
| JPEG and PNG load at the limits          | Unit boundaries and Chrome test |
| Panels, zoom, and tool are deterministic | Fixed config and visual check   |
| Invalid input names the reason           | Typed validation unit tests     |
| 20 MiB load time is recorded             | Chrome integration and TRD note |

## References

- [Issue #15](https://github.com/M1KUAPP/astra/issues/15)
- [Photopea API](https://www.photopea.com/api/)
- [Photopea environment](https://www.photopea.com/api/environment)
- [Photopea live messaging](https://www.photopea.com/api/live)
- [Photopea scripts](https://www.photopea.com/learn/scripts)
- [PNG IHDR field specification](https://www.w3.org/TR/png-3/#11IHDR)
- [JPEG frame header specification, section B.2.2](https://www.w3.org/Graphics/JPEG/itu-t81.pdf)
- [Exif TIFF structure and orientation specification](https://www.cipa.jp/std/documents/e/DC-X008-Translation-2019-E.pdf)
- [Technical design](../../TRD.md#the-editor-adapter)
- [Input requirements](../../PRD.md#input)
