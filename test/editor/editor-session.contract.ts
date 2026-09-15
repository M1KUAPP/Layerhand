import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import type { EditorSession, LayerInfo } from '../../src/editor/session'

type EditorSessionFactory = () => Promise<EditorSession>

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function assertLayerTree(layers: readonly LayerInfo[]): void {
  expect(Array.isArray(layers)).toBe(true)
  for (const layer of layers) {
    expect(layer.name.trim().length).toBeGreaterThan(0)
    expect(['raster', 'adjustment', 'group']).toContain(layer.kind)
    expect(typeof layer.visible).toBe('boolean')
    expect(Array.isArray(layer.masks)).toBe(true)
    for (const mask of layer.masks) {
      expect(['pixel', 'vector']).toContain(mask.kind)
      expect(typeof mask.enabled).toBe('boolean')
    }
    assertLayerTree(layer.children)
  }
}

export function defineEditorSessionContract(name: string, createSession: EditorSessionFactory): void {
  describe(`${name} EditorSession contract`, () => {
    test('opens, acts, inspects, exports, and closes', async () => {
      const session = await createSession()
      try {
        expect(session.id.length).toBeGreaterThan(0)
        expect(session.viewport.width).toBeGreaterThan(0)
        expect(session.viewport.height).toBeGreaterThan(0)

        const image = await readFile(new URL('../../src/editor/fixtures/photopea-frame.png', import.meta.url))
        await session.open(image, 'photopea-frame.png')
        const frame = await session.screenshot()
        expect(Array.from(frame.slice(0, 8))).toEqual(pngSignature)

        await session.act([
          { type: 'move', x: 40, y: 50 },
          { type: 'click', button: 'left', x: 40, y: 50 }
        ])

        const layers = await session.layers()
        expect(layers.length).toBeGreaterThanOrEqual(1)
        assertLayerTree(layers)

        const psd = await session.exportPsd()
        expect(new TextDecoder().decode(psd.slice(0, 4))).toBe('8BPS')

        const preview = await session.exportPreview()
        expect(Array.from(preview.slice(0, 8))).toEqual(pngSignature)
      } finally {
        await session.close()
      }
    })
  })
}
