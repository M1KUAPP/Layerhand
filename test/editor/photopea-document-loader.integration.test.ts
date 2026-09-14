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
    try {
      await browser?.close()
    } finally {
      await server?.stop(true)
    }
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
    expect(fixtures.maxJpeg.byteLength).toBe(20 * 1024 * 1024)

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
