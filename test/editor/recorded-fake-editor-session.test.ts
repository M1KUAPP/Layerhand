import { expect, test } from 'bun:test'
import { createRecordedFakeEditorSession } from '../../src/editor'

test('exposes the two named raster layers in the recorded PSD', async () => {
  const session = await createRecordedFakeEditorSession()
  try {
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    expect(await session.layers()).toEqual([
      { name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] },
      {
        name: 'Retouched photograph',
        kind: 'raster',
        visible: true,
        masks: [{ kind: 'pixel', enabled: true }],
        children: []
      }
    ])
  } finally {
    await session.close()
  }
})

test('exports the document preview separately from the editor viewport', async () => {
  const session = await createRecordedFakeEditorSession()
  try {
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    const frame = await session.screenshot()
    const preview = await session.exportPreview()
    const psd = await session.exportPsd()
    const frameHeader = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    const previewHeader = new DataView(preview.buffer, preview.byteOffset, preview.byteLength)
    const psdHeader = new DataView(psd.buffer, psd.byteOffset, psd.byteLength)

    expect([frameHeader.getUint32(16), frameHeader.getUint32(20)]).toEqual([1440, 900])
    expect([previewHeader.getUint32(16), previewHeader.getUint32(20)]).toEqual([640, 480])
    expect([psdHeader.getUint32(18), psdHeader.getUint32(14)]).toEqual([640, 480])
    expect(preview).not.toEqual(frame)
  } finally {
    await session.close()
  }
})
