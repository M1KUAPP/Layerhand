import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { readPsd } from 'ag-psd'
import { chromium } from 'playwright'

import { photopeaEditorUrl, selectPsdBeforeSentinel, type PhotopeaMessage } from './protocol.ts'

const PHOTO_URL = 'https://picsum.photos/seed/layerhand/640/480.jpg'
const PHOTOPEA_URL = photopeaEditorUrl()
const SENTINEL = `layerhand:export:${crypto.randomUUID()}`
const OUTPUT_DIRECTORY = resolve('output')
const outerHtml = `<!doctype html>
<html>
  <body style="margin:0">
    <iframe
      id="photopea"
      src="${PHOTOPEA_URL}"
      style="border:0;height:900px;width:1440px"
    ></iframe>
    <script>
      window.__photopeaMessages = [];
      window.__photopeaStartedAt = performance.now();
      window.addEventListener("message", function (event) {
        var frame = document.getElementById("photopea");
        if (event.source !== frame.contentWindow) return;
        window.__photopeaMessages.push({
          atMs: performance.now() - window.__photopeaStartedAt,
          data: event.data
        });
      });
    </script>
  </body>
</html>`

type SerializedMessage =
  { atMs: number; kind: 'string'; value: string } | { atMs: number; base64: string; kind: 'binary'; size: number }

await mkdir(OUTPUT_DIRECTORY, { recursive: true })

const photoResponse = await fetch(PHOTO_URL)
if (!photoResponse.ok) {
  throw new Error(`Photo download failed with HTTP ${photoResponse.status}`)
}

const jpeg = Buffer.from(await photoResponse.arrayBuffer())
if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
  throw new Error('The downloaded fixture is not a JPEG')
}

const startedAt = performance.now()
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(outerHtml, { headers: { 'content-type': 'text/html' } })
})
const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const consoleMessages: string[] = []
  page.on('console', (message) => consoleMessages.push(message.text()))

  const readyStartedAt = performance.now()
  await page.goto(server.url.href, { waitUntil: 'domcontentloaded' })

  await page.waitForFunction(
    () =>
      (
        window as typeof window & {
          __photopeaMessages: Array<{ data: unknown }>
        }
      ).__photopeaMessages.some((message) => message.data === 'done'),
    undefined,
    { timeout: 45_000 }
  )
  const readyMs = performance.now() - readyStartedAt

  const uploadStartIndex = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __photopeaMessages: Array<{ data: unknown }>
        }
      ).__photopeaMessages.length
  )
  const uploadStartedAt = performance.now()

  await page.evaluate(
    ({ base64 }) => {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }
      const frame = document.getElementById('photopea') as HTMLIFrameElement
      frame.contentWindow?.postMessage(bytes.buffer, '*', [bytes.buffer])
    },
    { base64: jpeg.toString('base64') }
  )

  await page.waitForFunction(
    ({ startIndex }) =>
      (
        window as typeof window & {
          __photopeaMessages: Array<{ data: unknown }>
        }
      ).__photopeaMessages
        .slice(startIndex)
        .some((message) => message.data === 'done'),
    { startIndex: uploadStartIndex },
    { timeout: 30_000 }
  )
  const uploadMs = performance.now() - uploadStartedAt

  const exportStartIndex = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __photopeaMessages: Array<{ data: unknown }>
        }
      ).__photopeaMessages.length
  )
  const exportStartedAt = performance.now()
  const script = [
    'var doc = app.activeDocument;',
    'doc.activeLayer.name = "Original photograph";',
    'var edited = doc.activeLayer.duplicate();',
    'edited.name = "Retouched copy";',
    'app.echoToOE("done");',
    'doc.saveToOE("psd");',
    `app.echoToOE("${SENTINEL}");`
  ].join('\n')

  await page.evaluate(
    ({ scriptText }) => {
      const frame = document.getElementById('photopea') as HTMLIFrameElement
      frame.contentWindow?.postMessage(scriptText, '*')
    },
    { scriptText: script }
  )

  await page.waitForFunction(
    ({ sentinel, startIndex }) => {
      const messages = (
        window as typeof window & {
          __photopeaMessages: Array<{ data: unknown }>
        }
      ).__photopeaMessages.slice(startIndex)
      return (
        messages.some((message) => message.data === sentinel) &&
        messages.some((message) => message.data instanceof ArrayBuffer)
      )
    },
    { sentinel: SENTINEL, startIndex: exportStartIndex },
    { timeout: 45_000 }
  )
  const exportMs = performance.now() - exportStartedAt

  const serialized = await page.evaluate(
    ({ startIndex }) => {
      const messages = (
        window as typeof window & {
          __photopeaMessages: Array<{ atMs: number; data: unknown }>
        }
      ).__photopeaMessages.slice(startIndex)

      return messages.map((message): SerializedMessage => {
        if (typeof message.data === 'string') {
          return { atMs: message.atMs, kind: 'string', value: message.data }
        }

        const bytes = new Uint8Array(message.data as ArrayBuffer)
        let binary = ''
        for (let offset = 0; offset < bytes.length; offset += 32_768) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768))
        }
        return {
          atMs: message.atMs,
          base64: btoa(binary),
          kind: 'binary',
          size: bytes.length
        }
      })
    },
    { startIndex: exportStartIndex }
  )

  const messages: PhotopeaMessage[] = serialized.map((message) =>
    message.kind === 'string' ? message.value : Buffer.from(message.base64, 'base64').buffer
  )
  const psdArrayBuffer = selectPsdBeforeSentinel(messages, SENTINEL)
  const psd = Buffer.from(psdArrayBuffer)

  if (psd.subarray(0, 4).toString('ascii') !== '8BPS') {
    throw new Error('Photopea export does not have a PSD 8BPS signature')
  }

  const parsed = readPsd(psd, {
    skipCompositeImageData: true,
    skipLayerImageData: true,
    skipThumbnail: true
  })
  const layers = (parsed.children ?? []).map((layer) => layer.name)
  if (layers.length < 2) {
    throw new Error(`Expected at least two layers, received ${layers.length}`)
  }

  const psdPath = resolve(OUTPUT_DIRECTORY, 'photopea-round-trip.psd')
  const screenshotPath = resolve(OUTPUT_DIRECTORY, 'photopea-final.png')
  await writeFile(psdPath, psd)
  await page.screenshot({ path: screenshotPath })

  const result = {
    browser: 'Google Chrome via Playwright',
    consoleMessages,
    exportMs: Math.round(exportMs),
    fixtureBytes: jpeg.length,
    fixtureUrl: PHOTO_URL,
    height: parsed.height,
    layers,
    messageSequence: serialized.map((message) =>
      message.kind === 'string' ? `string:${message.value}` : `binary:${message.size}`
    ),
    psdBytes: psd.length,
    psdPath,
    readyMs: Math.round(readyMs),
    screenshotPath,
    totalMs: Math.round(performance.now() - startedAt),
    uploadMs: Math.round(uploadMs),
    width: parsed.width
  }

  await writeFile(resolve(OUTPUT_DIRECTORY, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.close()
  server.stop(true)
}
