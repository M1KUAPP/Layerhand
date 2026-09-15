import { describe, expect, test } from 'bun:test'
import type { AdjustmentLayer, Psd } from 'ag-psd'
import { PhotopeaExportError, parsePsdMetadata, toLayerInfoTree, type AdjustmentType } from '../../src/editor'
import { psdBytes, rgba } from './support/psd-fixtures'

function psd(children: NonNullable<Psd['children']>): Psd {
  return {
    width: 2,
    height: 1,
    imageData: rgba(2, 1, [1, 2, 3, 255, 4, 5, 6, 255]),
    children
  }
}

function expectInvalidPsd(bytes: Uint8Array): void {
  try {
    parsePsdMetadata(bytes)
    throw new Error('Expected parsePsdMetadata to throw')
  } catch (error) {
    expect(error).toBeInstanceOf(PhotopeaExportError)
    expect((error as PhotopeaExportError).code).toBe('photopea_invalid_psd')
    expect((error as Error).message).toBe('Photopea returned invalid PSD bytes.')
  }
}

const adjustments = [
  ['brightness/contrast', { type: 'brightness/contrast' }],
  ['levels', { type: 'levels' }],
  ['curves', { type: 'curves' }],
  ['exposure', { type: 'exposure' }],
  ['vibrance', { type: 'vibrance' }],
  ['hue/saturation', { type: 'hue/saturation' }],
  ['color balance', { type: 'color balance' }],
  ['black & white', { type: 'black & white' }],
  ['photo filter', { type: 'photo filter' }],
  ['channel mixer', { type: 'channel mixer' }],
  ['color lookup', { type: 'color lookup' }],
  ['invert', { type: 'invert' }],
  ['posterize', { type: 'posterize' }],
  ['threshold', { type: 'threshold' }],
  ['gradient map', { type: 'gradient map', gradientType: 'solid' }],
  ['selective color', { type: 'selective color' }]
] as const satisfies readonly [AdjustmentType, AdjustmentLayer][]

describe('parsePsdMetadata', () => {
  test('maps document dimensions, hidden rasters, and nested empty groups', () => {
    const metadata = parsePsdMetadata(
      psdBytes(
        psd([
          { name: 'Hidden raster', hidden: true, imageData: rgba(2, 1, [0, 0, 0, 255, 0, 0, 0, 255]) },
          { name: 'Outer group', children: [{ name: 'Empty group', children: [] }] }
        ])
      )
    )

    expect(metadata).toEqual({
      width: 2,
      height: 1,
      layers: [
        {
          name: 'Hidden raster',
          kind: 'raster',
          visible: false,
          masks: [],
          children: []
        },
        {
          name: 'Outer group',
          kind: 'group',
          visible: true,
          masks: [],
          children: [
            {
              name: 'Empty group',
              kind: 'group',
              visible: true,
              masks: [],
              children: []
            }
          ]
        }
      ]
    })
  })

  test.each(adjustments)('maps a %s adjustment layer', (adjustmentType, adjustment) => {
    const metadata = parsePsdMetadata(psdBytes(psd([{ name: adjustmentType, adjustment }])))

    expect(metadata.layers).toEqual([
      {
        name: adjustmentType,
        kind: 'adjustment',
        adjustmentType,
        visible: true,
        masks: [],
        children: []
      }
    ])
  })

  test('uses the disabled real pixel mask before the regular mask and appends the disabled vector mask', () => {
    const metadata = parsePsdMetadata(
      psdBytes(
        psd([
          {
            name: 'Masked raster',
            imageData: rgba(2, 1, [0, 0, 0, 255, 0, 0, 0, 255]),
            mask: {
              imageData: rgba(1, 1, [255]),
              disabled: false
            },
            realMask: {
              imageData: rgba(1, 1, [255]),
              disabled: true
            },
            vectorMask: { paths: [], disable: true }
          }
        ])
      )
    )

    expect(metadata.layers[0]?.masks).toEqual([
      { kind: 'pixel', enabled: false },
      { kind: 'vector', enabled: false }
    ])
  })

  test('emits only the vector mask when the pixel mask derives from vector data', () => {
    const metadata = parsePsdMetadata(
      psdBytes(
        psd([
          {
            name: 'Vector mask',
            imageData: rgba(2, 1, [0, 0, 0, 255, 0, 0, 0, 255]),
            mask: { imageData: rgba(1, 1, [255]), fromVectorData: true },
            vectorMask: { paths: [] }
          }
        ])
      )
    )

    expect(metadata.layers[0]?.masks).toEqual([{ kind: 'vector', enabled: true }])
  })

  test('reads an exact copy of a non-zero-offset byte view', () => {
    const bytes = psdBytes(psd([{ name: 'Raster', imageData: rgba(2, 1, [0, 0, 0, 255, 0, 0, 0, 255]) }]))
    const padded = new Uint8Array(bytes.length + 2)
    padded.set(bytes, 1)

    expect(parsePsdMetadata(padded.subarray(1, bytes.length + 1))).toMatchObject({
      width: 2,
      height: 1,
      layers: [{ name: 'Raster' }]
    })
  })

  test('translates malformed 8BPS bytes into the stable typed error', () => {
    expectInvalidPsd(Uint8Array.of(0x38, 0x42, 0x50, 0x53, 0x00, 0x01))
  })

  test('reads metadata without initializing a canvas', () => {
    expect(parsePsdMetadata(psdBytes(psd([])))).toMatchObject({ width: 2, height: 1 })
  })
})

describe('toLayerInfoTree', () => {
  test('copies the tree and omits parser-only adjustment metadata', () => {
    const parsed = parsePsdMetadata(psdBytes(psd([{ name: 'Invert', adjustment: { type: 'invert' } }]))).layers

    expect(toLayerInfoTree(parsed)).toEqual([
      {
        name: 'Invert',
        kind: 'adjustment',
        visible: true,
        masks: [],
        children: []
      }
    ])
  })
})
