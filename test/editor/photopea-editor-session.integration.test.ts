import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'
import sharp from 'sharp'
import {
  PhotopeaActionRunner,
  PhotopeaBridge,
  PhotopeaDocumentExporter,
  PhotopeaDocumentLoader,
  PhotopeaEditorSession,
  PlaywrightPhotopeaTransport,
  assertCompleteLayerTree,
  createPhotopeaHostHtml,
  createPlaywrightAuxiliaryMouse
} from '../../src/editor'
import { assertLayerTree } from './editor-session.contract'
import { maskedSubjectPsd } from './support/psd-fixtures'

const live = process.env.LAYERHAND_CHROME_INTEGRATION === '1'
const describeLive = live ? describe : describe.skip
const viewport = { width: 1440, height: 900 }
// Center of the visible mask thumbnail with the fixed 1440-by-900 host.
const MASK_THUMBNAIL = { x: 1268, y: 324 }
const INVERT_MASK_KEYS = process.platform === 'darwin' ? ['COMMAND', 'I'] : ['CTRL', 'I']

async function decodePreview(bytes: Uint8Array) {
  expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  expect(decoded.info).toMatchObject({ width: 64, height: 64, channels: 4 })
  return decoded.data
}

describeLive('Photopea editor session in Google Chrome', () => {
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

  test('exports a reopenable pixel mask that remains editable through GUI actions', async () => {
    const page = await browser.newPage({ viewport })
    const transport = new PlaywrightPhotopeaTransport(page, { hostUrl: new URL('/', server.url).toString() })
    const bridge = new PhotopeaBridge(transport)
    const exporter = new PhotopeaDocumentExporter(bridge)
    const session = new PhotopeaEditorSession({
      id: 'masked-export-integration',
      viewport,
      loader: new PhotopeaDocumentLoader(bridge),
      exporter,
      actions: new PhotopeaActionRunner(page, createPlaywrightAuxiliaryMouse(page)),
      release: () => page.close()
    })

    try {
      const png = await sharp({
        create: { width: 64, height: 64, channels: 4, background: '#ff0000' }
      })
        .png()
        .toBuffer()
      await session.open(png, 'original.png')
      // PSD setup is test-only; the production open contract stays JPEG/PNG.
      await bridge.openFile(maskedSubjectPsd())

      const [psd, preview, layers] = await Promise.all([session.exportPsd(), session.exportPreview(), session.layers()])
      expect(new TextDecoder().decode(psd.subarray(0, 4))).toBe('8BPS')
      expect(layers).toEqual([
        {
          name: 'Masked subject',
          kind: 'raster',
          visible: true,
          masks: [{ kind: 'pixel', enabled: true }],
          children: []
        }
      ])
      assertLayerTree(layers)
      expect(() => assertCompleteLayerTree(layers)).not.toThrow()
      const before = await decodePreview(preview)
      const centerAlpha = (32 * 64 + 32) * 4 + 3
      const edgeAlpha = (4 * 64 + 4) * 4 + 3
      expect(before[centerAlpha]).toBe(0)
      expect(before[edgeAlpha]).toBe(255)
      expect(Array.from(before.subarray(edgeAlpha - 3, edgeAlpha))).toEqual([255, 0, 0])

      await bridge.openFile(psd)
      const documents = await bridge.runScript('app.echoToOE("documents:" + app.documents.length);')
      expect(documents).toContainEqual({ type: 'text', value: 'documents:3' })
      // Read the reopened document afresh, independently of the session cache.
      const reopened = await exporter.exportSnapshot()
      expect(reopened.layers).toEqual(layers)
      expect(await decodePreview(reopened.preview)).toEqual(before)

      await session.act([
        { type: 'click', button: 'left', ...MASK_THUMBNAIL },
        { type: 'wait' },
        { type: 'keypress', keys: INVERT_MASK_KEYS },
        { type: 'wait' }
      ])
      const after = await decodePreview(await session.exportPreview())
      let changedPixels = 0
      for (let offset = 0; offset < before.length; offset += 4) {
        if (!before.subarray(offset, offset + 4).equals(after.subarray(offset, offset + 4))) changedPixels += 1
      }
      expect(changedPixels).toBeGreaterThan(0)
      expect(after[centerAlpha]).toBe(255)
      expect(after[edgeAlpha]).toBe(0)
      expect(Array.from(after.subarray(centerAlpha - 3, centerAlpha))).toEqual([255, 0, 0])
      expect(await session.layers()).toEqual(layers)
      console.log(
        JSON.stringify({
          event: 'photopea_masked_export',
          chrome: browser.version(),
          maskThumbnail: MASK_THUMBNAIL,
          invertKeys: INVERT_MASK_KEYS,
          psdBytes: psd.byteLength,
          previewBytes: preview.byteLength,
          changedPixels,
          before: { centerAlpha: before[centerAlpha], edgeAlpha: before[edgeAlpha] },
          after: { centerAlpha: after[centerAlpha], edgeAlpha: after[edgeAlpha] }
        })
      )
    } finally {
      await session.close()
    }
  }, 120_000)
})
