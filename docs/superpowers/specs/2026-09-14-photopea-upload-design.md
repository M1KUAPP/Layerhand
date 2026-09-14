# Photopea upload design

## Status

Approved in chat on September 14, 2026. This design implements issue #15,
`feat(editor): open an uploaded image in the editor`.

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
- Reject invalid input before a browser is started, with a stable code and a
  message that names the reason.
- Open the original bytes in Photopea without downsampling them.
- Verify the resulting Photopea document rather than assuming that a message
  was successful.
- Leave Photopea in a deterministic English-language layout, fitted to the
  viewport with the Move tool selected.
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
3. Read dimensions from the header without decoding the full image.
4. Reject a zero dimension or malformed segment structure.
5. Check the long edge against `MAX_IMAGE_EDGE`.

PNG validation requires the eight-byte signature and a valid first `IHDR`
chunk. JPEG validation scans bounded marker segments until a supported
start-of-frame marker supplies the dimensions. The returned bytes are a
defensive copy.

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
ready `"done"`. `openFile()` sends one file followed by an ES3 sentinel script
and waits for that exact sentinel, ignoring generic `"done"` messages.
`runScript()` follows the same rule, returns messages received before its
sentinel, and never allows overlapping commands. `press()` delegates a keyboard
shortcut to the injected transport.

On a readiness or command timeout, the bridge reloads the outer page once and
throws `PhotopeaProtocolError` with code `photopea_timeout`. It does not resend
the file automatically, because a late first request plus a retry could open the
document twice.

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

1. Boots the configured Photopea frame.
2. Sends the validated bytes.
3. Runs one ES3 verification script that sets the document name, calls
   `app.UI.fitTheArea()`, and echoes the actual width, height, and name.
4. Presses `v` through Chrome to select the Move tool.
5. Compares the echoed dimensions and name with the validated input.
6. Returns the measured time from byte send through successful verification.

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
validate magic, length, and dimensions
    |
    v
boot outer host and Photopea iframe in Chrome
    |
    v
post copied ArrayBuffer and wait for completion
    |
    v
run ES3 read-back script with unique sentinel
    |
    v
fit viewport, select Move tool, compare metadata
    |
    v
return LoadedPhotopeaDocument and timing
```

No input-validation failure reaches Chrome. No image is downsampled. The
validated dimensions describe the source document, while `viewport` remains the
1440x900 browser coordinate space from Contract 1.

## Error handling

- Validation errors are deterministic and have stable codes and messages.
- Browser startup and message waits have bounded timeouts.
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
- Stable error codes and messages.
- Defensive byte copying.

`test/editor/photopea-bridge.test.ts` uses an in-memory transport and covers:

- The fixed boot configuration.
- File-byte copying.
- Ignoring misleading `"done"` messages before an exact sentinel.
- Command serialization.
- Timeout reload without automatic resend.

`test/editor/photopea-document-loader.test.ts` covers:

- Validation occurs before bridge boot.
- The verification script is ES3-compatible.
- Filename escaping.
- Dimension and filename read-back.
- Fit-to-area and Move-tool normalization.
- Deterministic load-time measurement.
- Metadata mismatch and malformed response failures.

### Google Chrome integration test

`test/editor/photopea-document-loader.integration.test.ts` is opt-in through
`LAYERHAND_CHROME_INTEGRATION=1`. It uses `playwright-core` with
`channel: 'chrome'`, serves the outer host on `127.0.0.1`, and opens real JPEG
and PNG bytes in the public Photopea editor.

The integration harness creates boundary fixtures at runtime rather than
committing tens of megabytes. Unit tests prove the exact byte and dimension
limits; the live test opens both formats, including a 6000-pixel long-edge
fixture, and records the load time for a 20 MiB valid container. The committed
test remains skipped in ordinary CI until a Chrome-enabled job is added.

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
- [Technical design](../../TRD.md#the-editor-adapter)
- [Input requirements](../../PRD.md#input)
