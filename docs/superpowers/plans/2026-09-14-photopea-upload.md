# Photopea upload implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate JPEG and PNG uploads, open them in Photopea through an
injected Google Chrome page, verify the resulting document, normalize the
editor state, and record the load time.

**Architecture:** A pure header validator protects the browser boundary. A
provider-neutral transport and sentinelled bridge isolate Photopea's
`postMessage` protocol, while a focused document loader composes validation,
opening, read-back, and UI normalization. `playwright-core` supplies the Chrome
page implementation without owning browser creation.

**Tech stack:** TypeScript 7, Bun 1.4, Bun Test, `playwright-core`, installed
Google Chrome, Photopea live messaging, and test-only `sharp` fixture
generation.

**Spec:**
[`docs/superpowers/specs/2026-09-14-photopea-upload-design.md`](../specs/2026-09-14-photopea-upload-design.md)

## Global constraints

- Use Bun for dependency installation and every repository script.
- Write and observe each failing test before its production implementation.
- Detect JPEG and PNG from magic bytes, never filename or content type.
- Accept at most `20 * 1024 * 1024` bytes and a 6000-pixel long edge.
- Validate before booting Chrome or Photopea.
- Keep Photopea scripts ES3-compatible.
- Correlate each scripted call with an exact unique `app.echoToOE()` sentinel.
- Preserve the original image bytes and dimensions.
- Inject a Playwright `Page`; do not launch or dispose browsers in production
  adapter code.
- Keep live Chrome tests opt-in through `LAYERHAND_CHROME_INTEGRATION=1`.
- Keep retouching decisions GUI-driven. Scripts may only load, inspect, name,
  fit, and export documents.
- Keep Markdown prose within 80 characters except links, tables, headings, and
  code blocks.

---

### Task 1: Validate JPEG and PNG headers

**Files:**

- Create: `src/editor/image-upload.ts`
- Create: `test/editor/image-upload.test.ts`
- Modify: `src/editor/index.ts`

**Interfaces:**

- Consumes: `Uint8Array` bytes and a display filename.
- Produces: `MAX_IMAGE_BYTES`, `MAX_IMAGE_EDGE`, `ImageFormat`,
  `ImageUploadErrorCode`, `ImageUploadError`, `ValidatedImageUpload`, and
  `validateImageUpload(bytes, filename)`.

- [ ] **Step 1: Write PNG validation tests**

Create a header-only PNG helper and tests for detection, dimensions, defensive
copying, the exact limits, and stable failures:

```ts
import { describe, expect, test } from 'bun:test'
import { ImageUploadError, MAX_IMAGE_BYTES, validateImageUpload } from '../../src/editor/image-upload'

function png(width: number, height: number, size = 24): Uint8Array {
  const bytes = new Uint8Array(Math.max(size, 24))
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  new DataView(bytes.buffer).setUint32(8, 13)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}

function expectUploadError(operation: () => unknown, code: ImageUploadError['code'], message: string): void {
  try {
    operation()
    throw new Error('Expected validateImageUpload to throw')
  } catch (error) {
    expect(error).toBeInstanceOf(ImageUploadError)
    expect((error as ImageUploadError).code).toBe(code)
    expect((error as Error).message).toBe(message)
  }
}

describe('validateImageUpload PNG', () => {
  test('reads the format and dimensions and copies the bytes', () => {
    const source = png(6000, 1)
    const result = validateImageUpload(source, 'wide.png')
    source[0] = 0

    expect(result).toMatchObject({
      filename: 'wide.png',
      format: 'png',
      width: 6000,
      height: 1
    })
    expect(result.bytes[0]).toBe(0x89)
  })

  test('accepts exactly 20 MiB', () => {
    expect(validateImageUpload(png(1, 1, MAX_IMAGE_BYTES), 'max.png').bytes).toHaveLength(MAX_IMAGE_BYTES)
  })

  test('rejects one byte over 20 MiB', () => {
    expectUploadError(
      () => validateImageUpload(png(1, 1, MAX_IMAGE_BYTES + 1), 'large.png'),
      'image_too_large',
      'Image exceeds the 20 MB limit.'
    )
  })

  test('rejects a 6001-pixel long edge', () => {
    expectUploadError(
      () => validateImageUpload(png(6001, 1), 'wide.png'),
      'image_dimensions_too_large',
      'Image dimensions exceed the 6000 px limit.'
    )
  })

  test('rejects a truncated or invalid IHDR', () => {
    expectUploadError(() => validateImageUpload(png(0, 1), 'broken.png'), 'malformed_image', 'Image data is malformed.')
  })
})
```

- [ ] **Step 2: Run the PNG tests and observe the missing module failure**

Run:

```bash
bun test test/editor/image-upload.test.ts
```

Expected: FAIL because `src/editor/image-upload.ts` does not exist.

- [ ] **Step 3: Implement PNG validation**

Create `src/editor/image-upload.ts` with the public types and constants from the
spec. Implement `detectFormat`, `readPngDimensions`, and stable error creation.
The PNG reader must require:

```ts
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

const PNG_IHDR_LENGTH = 13
const PNG_IHDR_TYPE = [0x49, 0x48, 0x44, 0x52] as const
```

Read width and height with a big-endian `DataView`. Reject fewer than 24 bytes,
an incorrect IHDR length or type, and zero dimensions. Return
`Uint8Array.from(bytes)`.

- [ ] **Step 4: Run the PNG tests and observe them pass**

Run:

```bash
bun test test/editor/image-upload.test.ts
```

Expected: all PNG tests PASS.

- [ ] **Step 5: Add failing JPEG validation tests**

Extend the test with a minimal baseline JPEG containing an SOF0 marker:

```ts
function jpeg(width: number, height: number): Uint8Array {
  return Uint8Array.of(
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x0b,
    0x08,
    (height >>> 8) & 0xff,
    height & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    0x01,
    0x01,
    0x11,
    0x00,
    0xff,
    0xd9
  )
}

describe('validateImageUpload JPEG', () => {
  test('walks marker segments and reads SOF dimensions', () => {
    expect(validateImageUpload(jpeg(6000, 1), 'wide.jpg')).toMatchObject({
      filename: 'wide.jpg',
      format: 'jpeg',
      width: 6000,
      height: 1
    })
  })

  test('rejects a recognized JPEG without a complete SOF marker', () => {
    expectUploadError(
      () => validateImageUpload(Uint8Array.of(0xff, 0xd8, 0xff, 0xd9), 'bad.jpg'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test('rejects unknown magic bytes', () => {
    expectUploadError(
      () => validateImageUpload(Uint8Array.of(0x47, 0x49, 0x46), 'image.gif'),
      'unsupported_image_format',
      'Only JPEG and PNG images are supported.'
    )
  })
})
```

- [ ] **Step 6: Run the JPEG tests and observe the format failure**

Run:

```bash
bun test test/editor/image-upload.test.ts
```

Expected: the JPEG success test FAILS with `unsupported_image_format`.

- [ ] **Step 7: Implement bounded JPEG segment parsing**

Recognize `ff d8`, walk marker segments without reading outside the byte array,
and extract dimensions from these SOF markers:

```ts
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
```

Skip repeated `0xff` fill bytes and standalone markers. Require each segment
length to be at least two bytes and fully contained. Reject end-of-image or
start-of-scan before a valid SOF, truncated segments, and zero dimensions.

- [ ] **Step 8: Export the validation API and verify the task**

Add the public types and values to `src/editor/index.ts`, then run:

```bash
bun test test/editor/image-upload.test.ts
bun run typecheck
bun run lint
```

Expected: PASS with no warnings.

- [ ] **Step 9: Commit image validation**

```bash
git add src/editor/image-upload.ts src/editor/index.ts \
  test/editor/image-upload.test.ts
git commit -m "feat(editor): validate image uploads"
```

---

### Task 2: Define the Photopea transport and outer host

**Files:**

- Create: `src/editor/photopea-transport.ts`
- Create: `src/editor/photopea-host.ts`
- Create: `test/editor/photopea-host.test.ts`
- Modify: `src/editor/index.ts`

**Interfaces:**

- Consumes: Contract 1 `Viewport`.
- Produces: `PhotopeaConfiguration`, `PHOTOPEA_CONFIGURATION`,
  `PhotopeaMessage`, `PhotopeaTransport`, `PHOTOPEA_ORIGIN`, and
  `createPhotopeaHostHtml()`.

- [ ] **Step 1: Write the transport and host contract tests**

Create `test/editor/photopea-host.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { PHOTOPEA_CONFIGURATION, PHOTOPEA_ORIGIN, createPhotopeaHostHtml } from '../../src/editor'

describe('Photopea outer host', () => {
  test('uses the fixed editor environment', () => {
    expect(PHOTOPEA_CONFIGURATION).toEqual({
      environment: {
        theme: 0,
        lang: 'en',
        vmode: 0,
        intro: false,
        localsave: false,
        eparams: {
          guides: false,
          grid: false,
          paths: false,
          pgrid: false
        },
        panels: [2, 5, 18]
      }
    })
  })

  test('pins messaging to the Photopea frame and origin', () => {
    const html = createPhotopeaHostHtml()

    expect(PHOTOPEA_ORIGIN).toBe('https://www.photopea.com')
    expect(html).toContain('event.source !== frame.contentWindow')
    expect(html).toContain('event.origin !== PHOTOPEA_ORIGIN')
    expect(html).toContain('postMessage(payload, PHOTOPEA_ORIGIN)')
    expect(html).not.toContain('postMessage(payload, "*")')
  })
})
```

- [ ] **Step 2: Run the host tests and observe the missing exports**

Run:

```bash
bun test test/editor/photopea-host.test.ts
```

Expected: FAIL because the Photopea host and transport exports do not exist.

- [ ] **Step 3: Define the transport types and fixed configuration**

Create `src/editor/photopea-transport.ts` with readonly configuration types and:

```ts
export const PHOTOPEA_CONFIGURATION = {
  environment: {
    theme: 0,
    lang: 'en',
    vmode: 0,
    intro: false,
    localsave: false,
    eparams: {
      guides: false,
      grid: false,
      paths: false,
      pgrid: false
    },
    panels: [2, 5, 18]
  }
} as const satisfies PhotopeaConfiguration

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

- [ ] **Step 4: Implement the static outer host**

Create `src/editor/photopea-host.ts`. `createPhotopeaHostHtml()` returns a
complete HTML document:

```ts
import { PHOTOPEA_ORIGIN } from './photopea-transport'

export function createPhotopeaHostHtml(): string {
  const origin = JSON.stringify(PHOTOPEA_ORIGIN)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      html, body, #photopea { width: 100%; height: 100%; margin: 0; border: 0; }
      body { overflow: hidden; }
    </style>
  </head>
  <body>
    <iframe id="photopea" title="Photopea"></iframe>
    <script>
      (function () {
        var PHOTOPEA_ORIGIN = ${origin};
        var frame = document.getElementById('photopea');
        var messages = [];
        window.__layerhandPhotopeaMessages = messages;

        window.addEventListener('message', function (event) {
          if (event.source !== frame.contentWindow) return;
          if (event.origin !== PHOTOPEA_ORIGIN) return;

          if (typeof event.data === 'string') {
            messages.push({ type: 'text', value: event.data });
          } else if (event.data instanceof ArrayBuffer) {
            messages.push({
              type: 'bytes',
              value: Array.prototype.slice.call(new Uint8Array(event.data))
            });
          }
        });

        window.__layerhandSendToPhotopea = function (message) {
          var payload = message.value;
          if (message.type === 'bytes') {
            payload = new Uint8Array(message.value).buffer;
          }
          frame.contentWindow.postMessage(payload, PHOTOPEA_ORIGIN);
        };

        frame.src = PHOTOPEA_ORIGIN + '/#' + window.location.hash.slice(1);
      }());
    </script>
  </body>
</html>`
}
```

The host stays non-opaque because Playwright navigates to it over loopback HTTP,
not a `data:` URL. It accepts only strings and `ArrayBuffer` values from the
exact Photopea frame and origin. Byte messages are copied in both directions.

- [ ] **Step 5: Export and verify the host task**

Export the new public surface from `src/editor/index.ts`, then run:

```bash
bun test test/editor/photopea-host.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

- [ ] **Step 6: Commit the transport boundary**

```bash
git add src/editor/photopea-host.ts src/editor/photopea-transport.ts \
  src/editor/index.ts test/editor/photopea-host.test.ts
git commit -m "feat(editor): define the Photopea transport"
```

---

### Task 3: Implement the sentinelled Photopea bridge

**Files:**

- Create: `src/editor/photopea-bridge.ts`
- Create: `test/editor/photopea-bridge.test.ts`
- Modify: `src/editor/index.ts`

**Interfaces:**

- Consumes: `PhotopeaTransport`, `PhotopeaMessage`, and
  `PHOTOPEA_CONFIGURATION` from Task 2.
- Produces: `PhotopeaProtocolErrorCode`, `PhotopeaProtocolError`,
  `PhotopeaBridgeOptions`, and `PhotopeaBridge` with `boot()`, `openFile()`,
  `runScript()`, and `press()`.

- [ ] **Step 1: Write an in-memory transport and misleading-done test**

Create `test/editor/photopea-bridge.test.ts`. Its fake must copy byte inputs and
serve queued messages:

```ts
class MemoryTransport implements PhotopeaTransport {
  readonly viewport = { width: 1440, height: 900 }
  readonly sent: Array<string | Uint8Array> = []
  readonly bootConfigurations: PhotopeaConfiguration[] = []
  readonly pressed: string[] = []
  readonly messages: PhotopeaMessage[] = []
  reloads = 0

  async boot(configuration: PhotopeaConfiguration): Promise<void> {
    this.bootConfigurations.push(configuration)
  }

  async send(message: string | Uint8Array): Promise<void> {
    this.sent.push(typeof message === 'string' ? message : Uint8Array.from(message))
  }

  async nextMessage(): Promise<PhotopeaMessage> {
    const message = this.messages.shift()
    if (!message) throw new Error('timeout')
    return message
  }

  async press(key: string): Promise<void> {
    this.pressed.push(key)
  }

  async reload(): Promise<void> {
    this.reloads += 1
  }
}

class ControlledTransport extends MemoryTransport {
  readonly #resolvers: Array<(message: PhotopeaMessage) => void> = []

  override async nextMessage(): Promise<PhotopeaMessage> {
    return new Promise((resolve) => this.#resolvers.push(resolve))
  }

  resolveNext(message: PhotopeaMessage): void {
    const resolve = this.#resolvers.shift()
    if (!resolve) throw new Error('No pending Photopea message request.')
    resolve(message)
  }

  async waitForSentCount(count: number): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (this.sent.length >= count) return
      await Bun.sleep(0)
    }
    throw new Error(`Timed out waiting for ${count} sent messages.`)
  }

  async waitForMessageRequest(): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (this.#resolvers.length > 0) return
      await Bun.sleep(0)
    }
    throw new Error('Timed out waiting for a Photopea message request.')
  }
}

test('waits for the exact sentinel and ignores misleading done messages', async () => {
  const transport = new MemoryTransport()
  transport.messages.push(
    { type: 'text', value: 'done' },
    { type: 'text', value: 'metadata' },
    { type: 'text', value: 'sentinel-1' },
    { type: 'text', value: 'done' }
  )
  const bridge = new PhotopeaBridge(transport, {
    createSentinel: () => 'sentinel-1'
  })

  const result = await bridge.runScript('app.echoToOE("metadata");')

  expect(result).toEqual([
    { type: 'text', value: 'done' },
    { type: 'text', value: 'metadata' }
  ])
  expect(transport.sent[0]).toBe('app.echoToOE("metadata");\napp.echoToOE("sentinel-1");')
})
```

- [ ] **Step 2: Run the bridge test and observe the missing module failure**

Run:

```bash
bun test test/editor/photopea-bridge.test.ts
```

Expected: FAIL because `PhotopeaBridge` does not exist.

- [ ] **Step 3: Implement basic boot, script, file, and press operations**

Create `src/editor/photopea-bridge.ts` with these stable errors:

```ts
export type PhotopeaProtocolErrorCode = 'photopea_timeout' | 'photopea_protocol_error'

export class PhotopeaProtocolError extends Error {
  readonly code: PhotopeaProtocolErrorCode

  constructor(code: PhotopeaProtocolErrorCode, message: string) {
    super(message)
    this.name = 'PhotopeaProtocolError'
    this.code = code
  }
}
```

`boot()` calls `transport.boot(PHOTOPEA_CONFIGURATION)` and waits for a text
`"done"`. `runScript()` appends exactly one sentinel echo and collects all prior
messages. `openFile()` copies and sends the bytes, sends a sentinel-only script,
and waits for that exact sentinel. `press()` delegates to the transport.

- [ ] **Step 4: Verify basic bridge behavior passes**

Run:

```bash
bun test test/editor/photopea-bridge.test.ts
```

Expected: the misleading-done test PASS.

- [ ] **Step 5: Add failing serialization and timeout tests**

Add tests that prove:

```ts
test('serializes overlapping scripts', async () => {
  const transport = new ControlledTransport()
  const sentinels = ['sentinel-1', 'sentinel-2']
  const bridge = new PhotopeaBridge(transport, {
    createSentinel: () => sentinels.shift()!
  })

  const first = bridge.runScript('first();')
  const second = bridge.runScript('second();')
  await transport.waitForSentCount(1)
  expect(transport.sent).toHaveLength(1)

  await transport.waitForMessageRequest()
  transport.resolveNext({ type: 'text', value: 'sentinel-1' })
  await first
  await transport.waitForSentCount(2)
  expect(transport.sent[1]).toContain('second();')

  await transport.waitForMessageRequest()
  transport.resolveNext({ type: 'text', value: 'sentinel-2' })
  await second
})

test('reloads after timeout without resending the file', async () => {
  const transport = new MemoryTransport()
  const bridge = new PhotopeaBridge(transport, {
    commandTimeoutMs: 1,
    createSentinel: () => 'sentinel-1'
  })

  await expect(bridge.openFile(Uint8Array.of(1, 2, 3))).rejects.toMatchObject({ code: 'photopea_timeout' })
  expect(transport.reloads).toBe(1)
  expect(transport.sent).toHaveLength(2)
})
```

The controlled transport uses deferred promises for `nextMessage()` and bounded
polling helpers; it never calls Photopea or Chrome.

- [ ] **Step 6: Implement one shared command queue and bounded waits**

Use a private promise tail so `openFile()` and `runScript()` share one queue:

```ts
#tail: Promise<void> = Promise.resolve()

#enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = this.#tail.then(operation, operation)
  this.#tail = result.then(
    () => undefined,
    () => undefined
  )
  return result
}
```

Track an absolute deadline for each wait so repeated spurious messages cannot
extend the timeout forever. When `nextMessage()` rejects or the deadline is
exhausted, call `reload()` once and throw:

```ts
new PhotopeaProtocolError('photopea_timeout', 'Photopea did not complete the command before the timeout.')
```

Do not enqueue a retry.

- [ ] **Step 7: Export and verify the bridge task**

Export the bridge types from `src/editor/index.ts`, then run:

```bash
bun test test/editor/photopea-bridge.test.ts
bun run typecheck
bun run lint
```

Expected: PASS with serialization and timeout coverage.

- [ ] **Step 8: Commit the bridge**

```bash
git add src/editor/photopea-bridge.ts src/editor/index.ts \
  test/editor/photopea-bridge.test.ts
git commit -m "feat(editor): add the Photopea message bridge"
```

---

### Task 4: Adapt an injected Playwright page

**Files:**

- Create: `src/editor/playwright-photopea-transport.ts`
- Create: `test/editor/playwright-photopea-transport.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/editor/index.ts`

**Interfaces:**

- Consumes: `Page` from `playwright-core`, `Viewport`, `PhotopeaConfiguration`,
  `PhotopeaMessage`, `PhotopeaTransport`, and the host-page wire contract.
- Produces: `PlaywrightPhotopeaTransportOptions`,
  `PlaywrightPhotopeaTransport`, and `decodePhotopeaWireMessage(value)`.

- [ ] **Step 1: Add the supported Playwright dependency**

Run:

```bash
bun add playwright-core@latest
```

Expected: `playwright-core` appears under `dependencies`; no browser binary is
downloaded.

- [ ] **Step 2: Write failing wire-decoding and page-adapter tests**

Create `test/editor/playwright-photopea-transport.test.ts` with a minimal
structural page fake:

```ts
import { describe, expect, test } from 'bun:test'
import type { Page } from 'playwright-core'
import { PHOTOPEA_CONFIGURATION, PlaywrightPhotopeaTransport, decodePhotopeaWireMessage } from '../../src/editor'

interface PageFakeState {
  readonly navigations: string[]
  readonly evaluations: unknown[]
  readonly waitTimeouts: number[]
  readonly pressed: string[]
  reloads: number
  nextWire: unknown
}

function createPageFake(): Page & PageFakeState {
  const state: PageFakeState & Record<string, unknown> = {
    navigations: [],
    evaluations: [],
    waitTimeouts: [],
    pressed: [],
    reloads: 0,
    nextWire: undefined
  }

  state.goto = async (url: string) => {
    state.navigations.push(url)
  }
  state.evaluate = async (_callback: unknown, argument?: unknown) => {
    state.evaluations.push(argument)
    const result = state.nextWire
    state.nextWire = undefined
    return result
  }
  state.waitForFunction = async (...args: unknown[]) => {
    const options = args.at(-1) as { timeout?: number } | undefined
    state.waitTimeouts.push(options?.timeout ?? -1)
  }
  state.reload = async () => {
    state.reloads += 1
  }
  state.keyboard = {
    press: async (key: string) => {
      state.pressed.push(key)
    }
  }

  return state as unknown as Page & PageFakeState
}
```

Add these cases:

```ts
test('decodes copied text and byte messages', () => {
  expect(decodePhotopeaWireMessage({ type: 'text', value: 'done' })).toEqual({
    type: 'text',
    value: 'done'
  })
  const wire = { type: 'bytes', value: [1, 2, 3] }
  const decoded = decodePhotopeaWireMessage(wire)
  wire.value[0] = 9
  expect(decoded).toEqual({ type: 'bytes', value: Uint8Array.of(1, 2, 3) })
})

test('rejects malformed host messages', () => {
  expect(() => decodePhotopeaWireMessage({ type: 'bytes', value: ['x'] })).toThrow(
    'Photopea host returned an invalid message.'
  )
})

test('boots the configured non-opaque host URL', async () => {
  const page = createPageFake()
  const transport = new PlaywrightPhotopeaTransport(page, {
    hostUrl: 'http://127.0.0.1:4123/editor'
  })

  await transport.boot(PHOTOPEA_CONFIGURATION)

  const navigated = new URL(page.navigations[0]!)
  expect(navigated.origin).toBe('http://127.0.0.1:4123')
  expect(JSON.parse(decodeURIComponent(navigated.hash.slice(1)))).toEqual(PHOTOPEA_CONFIGURATION)
})

test('adapts page messaging, keyboard, timeout, and reload operations', async () => {
  const page = createPageFake()
  const transport = new PlaywrightPhotopeaTransport(page, {
    hostUrl: 'http://127.0.0.1:4123/editor'
  })

  await transport.send(Uint8Array.of(1, 2, 3))
  page.nextWire = { type: 'text', value: 'done' }

  expect(await transport.nextMessage(750)).toEqual({ type: 'text', value: 'done' })
  await transport.press('V')
  await transport.reload()

  expect(page.evaluations[0]).toEqual({ type: 'bytes', value: [1, 2, 3] })
  expect(page.waitTimeouts).toEqual([750])
  expect(page.pressed).toEqual(['V'])
  expect(page.reloads).toBe(1)
})
```

The fake is cast to `Page` only at the constructor boundary.

- [ ] **Step 3: Run the transport tests and observe missing exports**

Run:

```bash
bun test test/editor/playwright-photopea-transport.test.ts
```

Expected: FAIL because the transport implementation does not exist.

- [ ] **Step 4: Implement the Playwright transport**

Create a class with this constructor:

```ts
export interface PlaywrightPhotopeaTransportOptions {
  readonly hostUrl: string
  readonly viewport?: Viewport
}

export class PlaywrightPhotopeaTransport implements PhotopeaTransport {
  constructor(page: Page, options: PlaywrightPhotopeaTransportOptions)
}
```

Reject `about:`, `data:`, and non-HTTP(S) host URLs. `boot()` replaces only the
host URL fragment with encoded JSON configuration and calls `page.goto()`.

`send()` evaluates `window.__layerhandSendToPhotopea`, passing strings directly
and bytes as `Array.from(message)`. `nextMessage()` uses
`page.waitForFunction()` with the caller's timeout, shifts one wire message, and
decodes it defensively. `press()` calls `page.keyboard.press(key)`. `reload()`
calls `page.reload()`.

- [ ] **Step 5: Verify the Playwright transport task**

Export the transport from `src/editor/index.ts`, then run:

```bash
bun test test/editor/playwright-photopea-transport.test.ts
bun run typecheck
bun run lint
```

Expected: PASS without launching Chrome.

- [ ] **Step 6: Commit the Playwright adapter**

```bash
git add package.json bun.lock src/editor/index.ts \
  src/editor/playwright-photopea-transport.ts \
  test/editor/playwright-photopea-transport.test.ts
git commit -m "feat(editor): adapt Playwright for Photopea"
```

---

### Task 5: Compose validation and Photopea document loading

**Files:**

- Create: `src/editor/photopea-document-loader.ts`
- Create: `test/editor/photopea-document-loader.test.ts`
- Modify: `src/editor/index.ts`

**Interfaces:**

- Consumes: `validateImageUpload`, `ImageFormat`, `PhotopeaMessage`, and a
  structural `PhotopeaDocumentBridge` implemented by `PhotopeaBridge`.
- Produces: `PhotopeaDocumentError`, `LoadedPhotopeaDocument`, and
  `PhotopeaDocumentLoader.open(bytes, filename)`.

- [ ] **Step 1: Write the failing success-path loader test**

Create `test/editor/photopea-document-loader.test.ts` with a structural fake:

```ts
class RecordingBridge implements PhotopeaDocumentBridge {
  readonly calls: string[] = []
  readonly scripts: string[] = []
  messages: readonly PhotopeaMessage[] = []

  async boot(): Promise<void> {
    this.calls.push('boot')
  }

  async openFile(): Promise<void> {
    this.calls.push('openFile')
  }

  async runScript(script: string): Promise<readonly PhotopeaMessage[]> {
    this.calls.push('runScript')
    this.scripts.push(script)
    return this.messages
  }

  async press(key: string): Promise<void> {
    this.calls.push(`press:${key}`)
  }
}

test('opens, verifies, fits, and selects the Move tool', async () => {
  const bridge = new RecordingBridge()
  bridge.messages = [
    {
      type: 'text',
      value: 'layerhand:document:6000:1:wide%20photo.png'
    }
  ]
  const times = [100, 137]
  const loader = new PhotopeaDocumentLoader(bridge, {
    now: () => times.shift()!
  })

  const result = await loader.open(png(6000, 1), 'wide photo.png')

  expect(bridge.calls).toEqual(['boot', 'openFile', 'runScript', 'press:v'])
  expect(bridge.scripts[0]).toContain('app.UI.fitTheArea();')
  expect(bridge.scripts[0]).toContain('wide photo.png')
  expect(result).toEqual({
    filename: 'wide photo.png',
    format: 'png',
    width: 6000,
    height: 1,
    loadMs: 37
  })
})
```

Reuse the PNG header helper from the validation tests by moving it to
`test/editor/support/image-headers.ts`; update the first test file's imports in
the same failing-test commit.

- [ ] **Step 2: Run the loader test and observe the missing module failure**

Run:

```bash
bun test test/editor/photopea-document-loader.test.ts
```

Expected: FAIL because `PhotopeaDocumentLoader` does not exist.

- [ ] **Step 3: Implement the successful loader path**

Define:

```ts
export interface PhotopeaDocumentBridge {
  boot(): Promise<void>
  openFile(bytes: Uint8Array): Promise<void>
  runScript(script: string): Promise<readonly PhotopeaMessage[]>
  press(key: string): Promise<void>
}

export interface LoadedPhotopeaDocument {
  readonly filename: string
  readonly format: ImageFormat
  readonly width: number
  readonly height: number
  readonly loadMs: number
}
```

Call `validateImageUpload()` before `bridge.boot()`. Start timing immediately
before `bridge.openFile()`. Build an ES3 script that:

```js
var d = app.activeDocument
d.name = 'escaped filename'
app.UI.fitTheArea()
app.echoToOE(
  'layerhand:document:' + Math.round(d.width) + ':' + Math.round(d.height) + ':' + encodeURIComponent(d.name)
)
```

Escape backslash, quote, carriage return, newline, U+2028, and U+2029 in the
filename before insertion. Parse exactly one `layerhand:document:` message,
then press lowercase `v` and return the typed result.

- [ ] **Step 4: Run the success-path test and observe it pass**

Run:

```bash
bun test test/editor/photopea-document-loader.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add failing validation-order and read-back tests**

Add separate tests for these behaviors:

```ts
test('rejects invalid bytes before bridge boot', async () => {
  const bridge = new RecordingBridge()
  const loader = new PhotopeaDocumentLoader(bridge)

  await expect(loader.open(Uint8Array.of(1), 'bad.gif')).rejects.toMatchObject({ code: 'unsupported_image_format' })
  expect(bridge.calls).toEqual([])
})

test('rejects mismatched document metadata', async () => {
  const bridge = new RecordingBridge()
  bridge.messages = [{ type: 'text', value: 'layerhand:document:2:1:image.png' }]
  const loader = new PhotopeaDocumentLoader(bridge)

  await expect(loader.open(png(1, 1), 'image.png')).rejects.toMatchObject({
    code: 'photopea_document_mismatch'
  })
})

test('escapes filenames without modern JavaScript syntax', async () => {
  const bridge = new RecordingBridge()
  bridge.messages = [{ type: 'text', value: 'layerhand:document:1:1:a%22b.png' }]
  const loader = new PhotopeaDocumentLoader(bridge)

  await loader.open(png(1, 1), 'a"b.png')

  expect(bridge.scripts[0]).not.toMatch(/=>|`|for\s*\([^)]*\sof\s/)
  expect(bridge.scripts[0]).toContain('a\\"b.png')
})
```

Also cover a missing metadata message, malformed numeric fields, and a decoded
filename mismatch.

- [ ] **Step 6: Implement strict metadata parsing and mismatch errors**

Add:

```ts
export class PhotopeaDocumentError extends Error {
  readonly code = 'photopea_document_mismatch' as const

  constructor(message: string) {
    super(message)
    this.name = 'PhotopeaDocumentError'
  }
}
```

Reject absent, duplicate, malformed, non-positive, non-integer, or mismatched
metadata. Use the stable message:

```text
Photopea opened a document that does not match the uploaded image.
```

- [ ] **Step 7: Export and verify the loader task**

Export the loader surface from `src/editor/index.ts`, then run:

```bash
bun test test/editor/image-upload.test.ts \
  test/editor/photopea-document-loader.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

- [ ] **Step 8: Commit the document loader**

```bash
git add src/editor/index.ts src/editor/photopea-document-loader.ts \
  test/editor/image-upload.test.ts \
  test/editor/photopea-document-loader.test.ts \
  test/editor/support/image-headers.ts
git commit -m "feat(editor): open validated images in Photopea"
```

---

### Task 6: Prove the loader against installed Google Chrome

**Files:**

- Create: `test/editor/photopea-document-loader.integration.test.ts`
- Create: `test/editor/support/live-image-fixtures.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `docs/TRD.md`

**Interfaces:**

- Consumes: `createPhotopeaHostHtml`, `PlaywrightPhotopeaTransport`,
  `PhotopeaBridge`, `PhotopeaDocumentLoader`, installed Google Chrome, and the
  public Photopea site.
- Produces: an opt-in live integration test and recorded JPEG, PNG, and 20 MiB
  load times.

- [ ] **Step 1: Add test-only image generation**

Run:

```bash
bun add --dev sharp@latest
```

Create `test/editor/support/live-image-fixtures.ts`. Generate a 6000x1 raw RGB
row and encode it to PNG and JPEG with `sharp`:

```ts
import sharp from 'sharp'
import { MAX_IMAGE_BYTES } from '../../../src/editor'

const WIDTH = 6000

function padJpegWithAppSegments(bytes: Uint8Array, targetBytes: number): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('Expected a JPEG SOI marker.')
  }

  let remaining = targetBytes - bytes.byteLength
  if (remaining < 0 || (remaining > 0 && remaining < 4)) {
    throw new Error('The JPEG cannot be padded to the requested byte length.')
  }

  const segmentBytes: number[] = []
  while (remaining > 0) {
    let size = Math.min(remaining, 65_537)
    const leftover = remaining - size
    if (leftover > 0 && leftover < 4) size -= 4 - leftover
    if (size < 4) throw new Error('An APP15 segment must be at least four bytes.')
    segmentBytes.push(size)
    remaining -= size
  }

  const output = new Uint8Array(targetBytes)
  output.set(bytes.subarray(0, 2), 0)
  let offset = 2

  for (const size of segmentBytes) {
    const payloadBytes = size - 4
    output[offset] = 0xff
    output[offset + 1] = 0xef
    new DataView(output.buffer).setUint16(offset + 2, payloadBytes + 2)
    offset += size
  }

  output.set(bytes.subarray(2), offset)
  if (output.byteLength !== MAX_IMAGE_BYTES) {
    throw new Error('The padded JPEG must be exactly 20 MiB.')
  }
  return output
}

export async function createLiveBoundaryImages(): Promise<{
  png: Uint8Array
  jpeg: Uint8Array
  maxJpeg: Uint8Array
}> {
  const pixels = Buffer.alloc(WIDTH * 3, 0x7f)
  const input = { raw: { width: WIDTH, height: 1, channels: 3 as const } }
  const png = await sharp(pixels, input).png().toBuffer()
  const jpeg = await sharp(pixels, input).jpeg({ quality: 90 }).toBuffer()

  return {
    png: Uint8Array.from(png),
    jpeg: Uint8Array.from(jpeg),
    maxJpeg: padJpegWithAppSegments(jpeg, MAX_IMAGE_BYTES)
  }
}
```

The helper inserts valid APP15 segments immediately after the SOI marker. Each
segment has marker `ff ef`, a two-byte big-endian length no greater than 65535,
and a zero-filled payload. Its segment partition prevents an invalid one- to
three-byte remainder.

- [ ] **Step 2: Write the opt-in live Chrome test**

Create the integration test with this gate and lifecycle:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'
import {
  PhotopeaBridge,
  PhotopeaDocumentLoader,
  PlaywrightPhotopeaTransport,
  createPhotopeaHostHtml
} from '../../src/editor'
import { createLiveBoundaryImages } from './support/live-image-fixtures'

const live = process.env.LAYERHAND_CHROME_INTEGRATION === '1'
const describeLive = live ? describe : describe.skip

describeLive('Photopea document loader in Google Chrome', () => {
  let browser: Browser
  let server: ReturnType<typeof Bun.serve>

  beforeAll(async () => {
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () =>
        new Response(createPhotopeaHostHtml(), {
          headers: { 'content-type': 'text/html; charset=utf-8' }
        })
    })
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  })

  afterAll(async () => {
    await browser?.close()
    await server?.stop(true)
  })

  async function openImage(bytes: Uint8Array, filename: string) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    })

    try {
      const page = await context.newPage()
      const transport = new PlaywrightPhotopeaTransport(page, {
        hostUrl: new URL('/', server.url).toString()
      })
      const bridge = new PhotopeaBridge(transport)
      const loader = new PhotopeaDocumentLoader(bridge)
      return await loader.open(bytes, filename)
    } finally {
      await context.close()
    }
  }

  test('opens PNG, JPEG, and exact-20-MiB JPEG boundary images', async () => {
    const fixtures = await createLiveBoundaryImages()
    const pngResult = await openImage(fixtures.png, 'boundary.png')
    const jpegResult = await openImage(fixtures.jpeg, 'boundary.jpg')
    const maxJpegResult = await openImage(fixtures.maxJpeg, 'boundary-20mib.jpg')

    expect(pngResult).toMatchObject({ format: 'png', width: 6000, height: 1 })
    expect(jpegResult).toMatchObject({ format: 'jpeg', width: 6000, height: 1 })
    expect(maxJpegResult).toMatchObject({ format: 'jpeg', width: 6000, height: 1 })

    console.log(
      JSON.stringify({
        event: 'photopea_upload_timings',
        pngMs: pngResult.loadMs,
        jpegMs: jpegResult.loadMs,
        maxJpegMs: maxJpegResult.loadMs
      })
    )
  }, 120_000)
})
```

Each fixture receives a fresh browser context and 1440x900 page, so document
state cannot leak between cases. The single stable JSON line captures all three
measurements.

- [ ] **Step 3: Run ordinary tests and verify the live test stays skipped**

Run:

```bash
bun test
bun run typecheck
bun run lint
```

Expected: all ordinary tests PASS and the Chrome suite reports skipped.

- [ ] **Step 4: Run the live test in installed Google Chrome**

Run:

```bash
LAYERHAND_CHROME_INTEGRATION=1 \
  bun test test/editor/photopea-document-loader.integration.test.ts \
  --timeout 120000
```

Expected: all three documents open as 6000x1 and the output contains one
`photopea_upload_timings` JSON line. If Chrome or Photopea fails, use the
systematic-debugging workflow before changing implementation or assertions.

- [ ] **Step 5: Record the measured load times**

Add an issue #15 result paragraph beside the B1 result in `docs/TRD.md`. State
the date, Google Chrome version, that both 6000x1 formats loaded at full
resolution, and the exact `pngMs`, `jpegMs`, and `maxJpegMs` values printed by
Step 4. Explicitly compare `maxJpegMs` with NFR-3's five-second start budget.

- [ ] **Step 6: Perform the visible Chrome check**

Run the same outer-host page in visible Google Chrome. Confirm and record in the
TRD paragraph that:

- Layers, Properties, and Adjustments panels are present.
- The document is fitted within the 1440x900 viewport.
- The Move tool is selected.
- The source document remains 6000x1.

Use computer control only for this visual verification; do not change the
adapter through ad hoc UI actions.

- [ ] **Step 7: Commit the live proof**

```bash
git add package.json bun.lock docs/TRD.md \
  test/editor/photopea-document-loader.integration.test.ts \
  test/editor/support/live-image-fixtures.ts
git commit -m "test(editor): verify Photopea uploads in Chrome"
```

---

### Task 7: Run the complete acceptance gate

**Files:**

- Verify only; modify production or test files only for a reproduced defect.

**Interfaces:**

- Consumes: every deliverable from Tasks 1 through 6.
- Produces: clean test, type, formatting, repository, and issue-acceptance
  evidence.

- [ ] **Step 1: Run every automated check**

```bash
bun test
bun run typecheck
bun run lint
git diff --check feat/editor-session-contract...HEAD
```

Expected: PASS with no warnings or whitespace errors.

- [ ] **Step 2: Re-run the live Chrome proof**

```bash
LAYERHAND_CHROME_INTEGRATION=1 \
  bun test test/editor/photopea-document-loader.integration.test.ts \
  --timeout 120000
```

Expected: PASS against installed Google Chrome and public Photopea.

- [ ] **Step 3: Audit the acceptance criteria**

Verify directly:

- Both JPEG and PNG load at the 6000-pixel boundary.
- A valid 20 MiB JPEG loads and has a measured time.
- The UI configuration, fitted viewport, and Move tool are deterministic.
- Unsupported, oversized, malformed, and over-dimension input each produce the
  specified reason.
- Invalid input reaches neither `boot()` nor Chrome.
- No Photoshop dependency or Photoshop automation was added.

- [ ] **Step 4: Request independent code review**

Ask the reviewer to compare `feat/editor-session-contract...HEAD` with issue
#15 and the design specification. Resolve every Critical or Important finding
through a failing regression test before changing production code.

- [ ] **Step 5: Confirm repository state**

```bash
git status --short
git log --oneline feat/editor-session-contract..HEAD
```

Expected: the worktree is clean and the branch contains only issue #15 commits.
