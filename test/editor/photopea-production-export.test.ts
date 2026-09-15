import { createHash } from 'node:crypto'

import { expect, test } from 'bun:test'
import {
  assertCompleteLayerTree,
  assertLayerNames,
  parsePsdMetadata,
  toLayerInfoTree,
  type LayerInfo
} from '../../src/editor'

const fixture = new URL('../../src/editor/fixtures/photopea-production-export.psd', import.meta.url)

const expectedLayers: LayerInfo[] = [
  {
    name: 'Original photograph',
    kind: 'raster',
    visible: true,
    masks: [{ kind: 'pixel', enabled: true }],
    children: []
  }
]

test('retained production Photopea PSD has the documented editable layer tree', async () => {
  const psd = await Bun.file(fixture).bytes()

  expect(createHash('sha256').update(psd).digest('hex')).toBe(
    'd709de6d233520b7fae8c95a89acfb035eae0720853d92509a72e3bb3298d7a7'
  )

  const layers = toLayerInfoTree(parsePsdMetadata(psd).layers)
  expect(layers).toEqual(expectedLayers)
  expect(() => assertLayerNames(layers)).not.toThrow()
  expect(() => assertCompleteLayerTree(layers)).not.toThrow()
})
