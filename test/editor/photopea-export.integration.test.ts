import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { chromium, type Browser } from 'playwright-core'
import {
  PhotopeaBridge,
  PhotopeaDocumentLoader,
  PlaywrightPhotopeaTransport,
  createPhotopeaHostHtml,
  type PhotopeaMessage
} from '../../src/editor'

const live = process.env.LAYERHAND_CHROME_INTEGRATION === '1'
const describeLive = live ? describe : describe.skip

// The sample photograph exports as a PSD of about 9 MB. As an array of numbers
// that took 62 seconds and overran the bridge's 60-second default (#50).
const WELL_INSIDE_THE_DEFAULT_MS = 10_000

type FileMessage = Extract<PhotopeaMessage, { type: 'bytes' }>

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

describeLive('Photopea export in Google Chrome', () => {
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
    try {
      await browser?.close()
    } finally {
      await server?.stop(true)
    }
  })

  test('brings the sample photograph out as a PSD and a preview, byte for byte, well inside the command timeout', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      const bridge = new PhotopeaBridge(
        new PlaywrightPhotopeaTransport(page, { hostUrl: new URL('/', server.url).toString() })
      )
      const sample = await Bun.file(new URL('../../src/web/assets/sample-photo.png', import.meta.url)).bytes()
      await new PhotopeaDocumentLoader(bridge).open(sample, 'layerhand-sample.png')

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

      const exported: Uint8Array[] = []
      const timings: Record<string, number> = {}
      for (const format of ['psd', 'png']) {
        const startedAt = performance.now()
        const messages = await bridge.runScript(`app.activeDocument.saveToOE("${format}");`)
        timings[`${format}Ms`] = Math.round(performance.now() - startedAt)
        const files = messages.filter((message): message is FileMessage => message.type === 'bytes')
        expect(files).toHaveLength(1)
        exported.push(files[0]!.value)
      }
      const digests = await page.evaluate(() =>
        Promise.all((window as unknown as { __layerhandExportDigests: Promise<string>[] }).__layerhandExportDigests)
      )
      const [psd, preview] = exported
      console.log(
        JSON.stringify({
          event: 'photopea_export_timings',
          chrome: browser.version(),
          psdBytes: psd!.byteLength,
          previewBytes: preview!.byteLength,
          ...timings
        })
      )

      expect(new TextDecoder().decode(psd!.subarray(0, 4))).toBe('8BPS')
      expect(digests).toEqual(exported.map(sha256))
      expect(timings.psdMs).toBeLessThan(WELL_INSIDE_THE_DEFAULT_MS)
    } finally {
      await page.close()
    }
  }, 180_000)
})
