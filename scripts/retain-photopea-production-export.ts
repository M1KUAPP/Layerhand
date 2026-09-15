import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium } from 'playwright-core'
import {
  PhotopeaActionRunner,
  PhotopeaBridge,
  PhotopeaDocumentExporter,
  PhotopeaDocumentLoader,
  PhotopeaEditorSession,
  PlaywrightPhotopeaTransport,
  assertCompleteLayerTree,
  assertLayerNames,
  createPhotopeaHostHtml,
  createPlaywrightAuxiliaryMouse
} from '../src/editor'

const fixturePath = resolve(import.meta.dir, '../src/editor/fixtures/photopea-production-export.psd')
const samplePath = resolve(import.meta.dir, '../src/web/assets/sample-photo.png')
const viewport = { width: 1440, height: 900 }

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () =>
    new Response(createPhotopeaHostHtml(), {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    })
})

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport })
const bridge = new PhotopeaBridge(
  new PlaywrightPhotopeaTransport(page, { hostUrl: new URL('/', server.url).toString() })
)
const session = new PhotopeaEditorSession({
  id: 'retain-production-export',
  viewport,
  loader: new PhotopeaDocumentLoader(bridge),
  exporter: new PhotopeaDocumentExporter(bridge),
  actions: new PhotopeaActionRunner(page, createPlaywrightAuxiliaryMouse(page)),
  release: () => page.close()
})

try {
  await session.open(await Bun.file(samplePath).bytes(), 'layerhand-sample.png')
  const messages = await bridge.runScript(`
try {
  var descriptor = new ActionDescriptor();
  var reference = new ActionReference();
  descriptor.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
  reference.putEnumerated(
    charIDToTypeID("Chnl"),
    charIDToTypeID("Chnl"),
    charIDToTypeID("Msk ")
  );
  descriptor.putReference(charIDToTypeID("At  "), reference);
  descriptor.putEnumerated(
    charIDToTypeID("Usng"),
    charIDToTypeID("UsrM"),
    charIDToTypeID("RvlA")
  );
  executeAction(charIDToTypeID("Mk  "), descriptor, DialogModes.NO);
  app.echoToOE("layerhand:retained-mask");
} catch (error) {
  app.echoToOE("layerhand:retained-mask-error:" + error);
}`)
  if (!messages.some((message) => message.type === 'text' && message.value === 'layerhand:retained-mask')) {
    throw new Error('Photopea did not create the retained pixel mask.')
  }

  const psd = await session.exportPsd()
  const layers = await session.layers()
  assertLayerNames(layers)
  assertCompleteLayerTree(layers)
  await writeFile(fixturePath, psd)
  console.log(
    JSON.stringify({
      event: 'retained_photopea_production_export',
      chrome: browser.version(),
      psdBytes: psd.byteLength,
      sha256: sha256(psd),
      layers
    })
  )
} finally {
  await session.close().catch(() => {})
  await browser.close()
  await server.stop(true)
}
