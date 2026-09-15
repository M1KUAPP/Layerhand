# ADR-0002: Upload images through an injected Photopea transport

This record explains how an upload reaches Photopea: validated from its
bytes before any browser starts, posted through an injected Playwright page,
and matched to its reply by a unique sentinel.

Contents:

1.  [Status](#status)
1.  [Context](#context)
1.  [Decision](#decision)
1.  [Alternatives considered](#alternatives-considered)
1.  [Consequences](#consequences)
1.  [Verification](#verification)
1.  [References](#references)

## Status

Accepted on September 14, 2026.

## Context

Layerhand must validate a JPEG or PNG, open the original bytes in Photopea, and
leave the document in a predictable state. Photopea accepts files as
`ArrayBuffer` messages and scripts as strings. Loading by URL introduces CORS
requirements, while the generic `"done"` message cannot safely correlate a
script because operations can emit it before the requested work is complete.

Local Chrome and the future hosted browser need the same editor protocol.
Browser creation and disposal therefore cannot be owned by the upload adapter.
Invalid inputs must also fail before any browser resources are started.

## Decision

Validate uploads from their bytes before booting Photopea. Accept JPEG and PNG
files up to 20 MiB and 6000 pixels on the longest edge, derive format and
displayed dimensions from bounded header parsing, including JPEG EXIF
orientation, and return stable typed errors. Preserve the original bytes rather
than downsampling them.

Define a provider-neutral `PhotopeaTransport` and implement it with an injected
Playwright `Page`. Serve Photopea inside a non-opaque HTTP or HTTPS outer host.
Accept messages only from the expected iframe and Photopea origin, and copy
binary inputs and outputs across the boundary. The caller owns browser creation
and teardown.

Place command correlation in `PhotopeaBridge`. Boot with a fixed English editor
configuration, serialize sentinelled file and script operations, and end each
adapter script with a unique `app.echoToOE()` sentinel. Ignore unrelated
`"done"` messages. On a timeout, reload once for cleanup and report a typed
error without automatically resending the image.

Compose validation and the bridge in `PhotopeaDocumentLoader`. Serialize the
complete open workflow by bridge identity, including calls from separate loader
instances, so concurrent uploads cannot reuse another call's document snapshot.
Before delivery, record the document count; after upload, require exactly one
newly appended document and select it from the collection. Run an ES3-compatible
read-back script that stores the complete filename in `Document.source`,
verifies that identity and the displayed dimensions, fits the canvas, and
selects the Move tool through the browser. Return success only when the observed
document matches the validated input.

## Alternatives considered

### Load the image from a URL

This is simpler for public assets but requires a reachable URL and compatible
CORS headers. Posting the original bytes supports local uploads without another
storage round trip.

### Wait for the next `"done"` message

The round-trip probe demonstrated a spurious `"done"` before PSD bytes and the
requested sentinel. Treating that message as correlation would desynchronise
commands and allow false success.

### Drive upload entirely through computer use

GUI automation remains useful for visual verification, but file transfer and
protocol waits need deterministic correlation, bounded timeouts, and unit tests.

### Own Playwright or Browserbase inside the adapter

This would simplify one caller at the cost of tying upload logic to a provider
and lifecycle. Injecting the page lets local Chrome and hosted CDP sessions use
the same implementation.

### Use raw CDP instead of Playwright

Raw CDP could implement the transport, but it would duplicate page, iframe,
keyboard, and navigation handling already provided by the project's browser
runtime dependency.

## Consequences

- Invalid files consume no browser session and receive stable error messages.
- Local Chrome and hosted browsers share one Photopea protocol implementation.
- Sentinel correlation prevents generic completion messages from ending a
  command early.
- The application must serve the outer host and provide a Playwright page.
- Sentinelled bridge operations and complete opens sharing a bridge are
  serialized; timeout recovery does not retry uploads automatically.
- Header validation does not prove that Photopea can decode the pixels, so the
  new-document check remains part of a successful open.
- DOM mutations still require read-back verification because Photopea operations
  can fail silently.

Revisit this decision if Photopea introduces a correlated binary protocol, if
the hosted provider cannot supply a compatible page, or if product requirements
need formats that bounded header validation cannot safely identify.

## Verification

- [`src/editor/image-upload.ts`](/src/editor/image-upload.ts) validates the
  byte and dimension boundaries.
- [`src/editor/photopea-transport.ts`](/src/editor/photopea-transport.ts)
  defines the provider-neutral message surface.
- [`src/editor/playwright-photopea-transport.ts`](/src/editor/playwright-photopea-transport.ts)
  implements the injected-page transport.
- [`src/editor/photopea-bridge.ts`](/src/editor/photopea-bridge.ts) owns
  readiness, serialization, sentinels, and timeout behavior.
- [`src/editor/photopea-document-loader.ts`](/src/editor/photopea-document-loader.ts)
  performs upload and document read-back.
- [`test/editor/image-upload-exif.test.ts`](/test/editor/image-upload-exif.test.ts)
  verifies orientation-aware displayed dimensions.
- [`test/editor/photopea-document-loader-concurrency.test.ts`](/test/editor/photopea-document-loader-concurrency.test.ts)
  verifies whole-workflow serialization and queue recovery.
- Tests under [`test/editor/`](/test/editor/) cover validation, protocol,
  concurrency, browser transport, and live Chrome integration.

## References

- [TRD: The editor adapter](/docs/TRD.md#the-editor-adapter)
- [GitHub issue #13](https://github.com/M1KUAPP/astra/issues/13)
- [GitHub issue #15](https://github.com/M1KUAPP/astra/issues/15)
- [Photopea round-trip evidence](/docs/evidence/photopea-round-trip/README.md)
- [Photopea live messaging](https://www.photopea.com/api/live)
