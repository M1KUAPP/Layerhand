import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'
import sharp from 'sharp'
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

  test('rejects a failed second decode without renaming the previous document', async () => {
    const page = await browser.newPage()
    const bytes = await sharp({
      create: { width: 32, height: 16, channels: 3, background: '#558899' }
    })
      .png()
      .toBuffer()

    try {
      const transport = new PlaywrightPhotopeaTransport(page, { hostUrl: new URL('/', server.url).toString() })
      const bridge = new PhotopeaBridge(transport)
      const loader = new PhotopeaDocumentLoader(bridge)
      await loader.open(bytes, 'original.png')

      const result = await loader.open(bytes.subarray(0, 33), 'truncated.png').catch((error: unknown) => error)
      const metadata = await bridge.runScript(
        'app.echoToOE("previous:" + app.documents.length + ":" + encodeURIComponent(app.activeDocument.source));'
      )

      expect(result).toMatchObject({ code: 'photopea_document_mismatch' })
      expect(metadata).toContainEqual({ type: 'text', value: 'previous:1:original.png' })

      await loader.open(bytes, 'second.png')
      const reopened = await bridge.runScript(
        'app.echoToOE("reopened:" + app.documents.length + ":" + app.documents[0].source + ":" + app.documents[1].source + ":" + app.activeDocument.source);'
      )
      expect(reopened).toContainEqual({ type: 'text', value: 'reopened:2:original.png:second.png:second.png' })
    } finally {
      await page.close()
    }
  }, 60_000)

  test('addresses the newly appended document through the Photopea collection', async () => {
    const page = await browser.newPage()
    const bytes = await sharp({
      create: { width: 32, height: 16, channels: 3, background: '#558899' }
    })
      .png()
      .toBuffer()
    try {
      const transport = new PlaywrightPhotopeaTransport(page, { hostUrl: new URL('/', server.url).toString() })
      const bridge = new PhotopeaBridge(transport)
      await new PhotopeaDocumentLoader(bridge).open(bytes, 'original.png')
      await bridge.openFile(bytes)
      const result = await bridge.runScript(
        'var next = app.documents[1]; app.activeDocument = app.documents[0]; ' +
          'var previous = app.activeDocument.source; app.activeDocument = next; next.source = "second.png"; ' +
          'app.echoToOE("collection:" + app.documents.length + ":" + previous + ":" + app.documents[0].source + ":" + app.documents[1].source + ":" + app.activeDocument.source);'
      )
      expect(result).toContainEqual({
        type: 'text',
        value: 'collection:2:original.png:original.png:second.png:second.png'
      })
    } finally {
      await page.close()
    }
  }, 60_000)

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
