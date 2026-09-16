import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type BrowserContext } from 'playwright-core'
import sharp from 'sharp'
import {
  MAX_IMAGE_EDGE,
  PhotopeaActionRunner,
  PhotopeaBridge,
  PhotopeaDocumentExporter,
  PhotopeaDocumentLoader,
  PhotopeaEditorSession,
  PlaywrightPhotopeaTransport,
  createPhotopeaHostHtml,
  createPlaywrightAuxiliaryMouse,
  type PhotopeaMessage
} from '../../src/editor'
import { connectOverCdp, type RemoteBrowser } from '../../src/server/browserbase-editor-session'

const live = process.env.LAYERHAND_CHROME_INTEGRATION === '1'
const describeLive = live ? describe : describe.skip

const MIB = 2 ** 20
// Playwright closes a CDP connection that carries one message over 256 MiB,
// which a file of about 192 MiB fills once it is encoded as base64 (#100).
const PAST_THE_MESSAGE_CAP = 210 * MIB

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const mib = (bytes: number) => Math.round(bytes / MIB)

// FR-1's largest image, square at the longest edge it accepts. Neighbouring
// pixels differ, as in a photograph, yet the JPEG stays well inside 20 MiB.
async function largestUpload(): Promise<Uint8Array> {
  const pixels = Buffer.alloc(MAX_IMAGE_EDGE * MAX_IMAGE_EDGE * 3)
  for (let y = 0; y < MAX_IMAGE_EDGE; y += 1) {
    for (let x = 0; x < MAX_IMAGE_EDGE; x += 1) {
      const offset = (y * MAX_IMAGE_EDGE + x) * 3
      pixels[offset] = (x + y) & 255
      pixels[offset + 1] = (2 * x + y) & 255
      pixels[offset + 2] = (x + 2 * y) & 255
    }
  }
  const raw = { width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, channels: 3 as const }
  return new Uint8Array(await sharp(pixels, { raw }).jpeg({ quality: 90 }).toBuffer())
}

describeLive('A large Photopea export over a CDP connection', () => {
  let upload: Uint8Array
  let server: ReturnType<typeof Bun.serve>
  let profile: string
  let chrome: BrowserContext
  let remote: RemoteBrowser

  beforeAll(async () => {
    upload = await largestUpload()
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () =>
        new Response(createPhotopeaHostHtml(), {
          headers: { 'content-type': 'text/html; charset=utf-8' }
        })
    })
    profile = await mkdtemp(join(tmpdir(), 'layerhand-cdp-'))
    // Launched only to be reached the way a hosted browser is: over a CDP WebSocket.
    chrome = await chromium.launchPersistentContext(profile, {
      channel: 'chrome',
      headless: true,
      args: ['--remote-debugging-port=0']
    })
    const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n')
    remote = await connectOverCdp(`ws://127.0.0.1:${port}${path}`)
  }, 60_000)

  afterAll(async () => {
    try {
      await remote?.close().catch(() => undefined)
      await chrome?.close()
    } finally {
      await server?.stop(true)
      if (profile) await rm(profile, { recursive: true, force: true })
    }
  })

  test('reads a PSD past the message cap out of the largest upload, through the production session', async () => {
    const { page } = remote
    const transport = new PlaywrightPhotopeaTransport(page, { hostUrl: new URL('/', server.url).toString() })
    // Times each file from the request for it to its last byte, Photopea building it included.
    const files: Array<{ bytes: number; ms: number }> = []
    const nextMessage = transport.nextMessage.bind(transport)
    transport.nextMessage = async (timeoutMs: number): Promise<PhotopeaMessage> => {
      const startedAt = performance.now()
      const message = await nextMessage(timeoutMs)
      if (message.type === 'bytes') {
        files.push({ bytes: message.value.byteLength, ms: Math.round(performance.now() - startedAt) })
      }
      return message
    }
    const bridge = new PhotopeaBridge(transport)
    const session = new PhotopeaEditorSession({
      id: 'large-export-integration',
      viewport: transport.viewport,
      loader: new PhotopeaDocumentLoader(bridge),
      exporter: new PhotopeaDocumentExporter(bridge),
      actions: new PhotopeaActionRunner(page, createPlaywrightAuxiliaryMouse(page)),
      release: async () => undefined
    })

    try {
      await session.open(upload, 'largest-upload.jpg')
      // Test setup, scripted: one full-size layer over the original, as a retouch leaves.
      await bridge.runScript('app.activeDocument.activeLayer.duplicate();')
      // Hashes each file as the page receives it from Photopea, before the transport touches it.
      await page.evaluate(() => {
        const digests: Promise<string>[] = []
        ;(window as unknown as { __layerhandExportDigests: Promise<string>[] }).__layerhandExportDigests = digests
        window.addEventListener('message', (event) => {
          if (!(event.data instanceof ArrayBuffer)) return
          digests.push(
            crypto.subtle
              .digest('SHA-256', event.data)
              .then((hash) => Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''))
          )
        })
      })

      Bun.gc(true)
      const rssBefore = process.memoryUsage.rss()
      let rssPeak = rssBefore
      const sampler = setInterval(() => {
        rssPeak = Math.max(rssPeak, process.memoryUsage.rss())
      }, 20)
      const startedAt = performance.now()
      let psd: Uint8Array
      let preview: Uint8Array
      try {
        // As the loop ends a run: the file, its preview, and its layers from one snapshot, then the
        // session closes while the loop still holds both files to publish.
        psd = await session.exportPsd()
        preview = await session.exportPreview()
        const layers = await session.layers()
        await session.close()
        rssPeak = Math.max(rssPeak, process.memoryUsage.rss())
        expect(layers.map((layer) => layer.name)).toEqual(['Original photograph', 'Retouched pixels'])
      } finally {
        clearInterval(sampler)
      }
      const exportMs = Math.round(performance.now() - startedAt)
      const digests = await page.evaluate(() =>
        Promise.all((window as unknown as { __layerhandExportDigests: Promise<string>[] }).__layerhandExportDigests)
      )

      console.log(
        JSON.stringify({
          event: 'photopea_large_export',
          chrome: remote.page.context().browser()?.version(),
          uploadBytes: upload.byteLength,
          psdBytes: psd.byteLength,
          previewBytes: preview.byteLength,
          files,
          exportMs,
          rssBeforeMiB: mib(rssBefore),
          rssPeakMiB: mib(rssPeak),
          maxRssMiB: mib(process.resourceUsage().maxRSS * 1024)
        })
      )

      expect(psd.byteLength).toBeGreaterThanOrEqual(PAST_THE_MESSAGE_CAP)
      expect(new TextDecoder().decode(psd.subarray(0, 4))).toBe('8BPS')
      // The page received the PSD, the PSD again once the duplicate was renamed, and the preview.
      expect(digests).toHaveLength(3)
      expect(digests.slice(1)).toEqual([sha256(psd), sha256(preview)])
    } finally {
      await session.close().catch(() => undefined)
    }
  }, 600_000)
})
