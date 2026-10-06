import { readFile } from 'node:fs/promises'
import { FakeEditorSession } from '../../apps/editor'
import { defineEditorSessionContract } from './editor-session.contract'

defineEditorSessionContract('single-layer metadata', async () => {
  const [frame, psd, preview] = await Promise.all([
    readFile(new URL('../../apps/editor/fixtures/photopea-frame.png', import.meta.url)),
    readFile(new URL('../../apps/editor/fixtures/layered-output.psd', import.meta.url)),
    readFile(new URL('../../apps/editor/fixtures/document-preview.png', import.meta.url))
  ])

  return new FakeEditorSession({
    id: 'single-layer-session',
    viewport: { width: 1440, height: 900 },
    recording: {
      frames: [frame],
      psd,
      preview,
      layers: [{ name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] }]
    }
  })
})
