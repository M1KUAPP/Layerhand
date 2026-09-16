import { describe, expect, test } from 'bun:test'
import {
  assertLayerNames,
  buildLayerRenamePlan,
  normalizeLayerName,
  PhotopeaExportError,
  type AdjustmentType,
  type LayerInfo,
  type ParsedLayerInfo
} from '../../src/editor'

function layer(
  name: string,
  kind: ParsedLayerInfo['kind'] = 'raster',
  adjustmentType?: AdjustmentType,
  children: readonly ParsedLayerInfo[] = []
): ParsedLayerInfo {
  return {
    name,
    kind,
    visible: true,
    masks: [],
    children,
    ...(adjustmentType ? { adjustmentType } : {})
  }
}

function applyRenamePlan(
  layers: readonly ParsedLayerInfo[],
  plan: ReturnType<typeof buildLayerRenamePlan>
): ParsedLayerInfo[] {
  const renames = new Map(plan.map((rename) => [rename.path.join('.'), rename.to]))

  const apply = (items: readonly ParsedLayerInfo[], path: readonly number[] = []): ParsedLayerInfo[] =>
    items.map((item, index) => {
      const itemPath = [...path, index]
      return {
        ...item,
        name: renames.get(itemPath.join('.')) ?? item.name,
        children: apply(item.children, itemPath)
      }
    })

  return apply(layers)
}

function expectInvalidLayerNames(layers: readonly LayerInfo[]): void {
  try {
    assertLayerNames(layers)
    throw new Error('Expected invalid layer names')
  } catch (error) {
    expect(error).toBeInstanceOf(PhotopeaExportError)
    expect((error as PhotopeaExportError).code).toBe('photopea_invalid_layer_name')
  }
}

describe('normalizeLayerName', () => {
  test.each([
    ['  Warm   highlights  ', 'Warm highlights'],
    ['Cafe\u0301', 'Café'],
    ['123 — ✓', '123 — ✓']
  ])('normalizes %j', (input, expected) => {
    expect(normalizeLayerName(input)).toBe(expected)
  })
})

describe('buildLayerRenamePlan', () => {
  test.each([
    ['123 — ✓', true],
    ['Layer', true],
    ['layer 12', true],
    ['Group', true],
    ['GROUP 4', true],
    ['Curves', true],
    ['curves 3', true],
    ['Brightness/Contrast 4', true],
    ['Hue/Saturation 7', true],
    ['Curves adjustment', false],
    ['Portrait copy', true],
    ['Portrait COPY 2', true],
    ['Color Fill 1', true],
    ['Gradient Fill 2', true],
    ['Pattern Fill 3', true],
    ['Shape 4', true]
  ])('recognizes whether %j is generic', (name, generic) => {
    const plan = buildLayerRenamePlan([layer(name)])
    expect(plan.length > 0).toBe(generic)
  })

  test.each([
    ['brightness/contrast', 'Brightness/Contrast', 'Brightness and contrast adjustment'],
    ['levels', 'Levels', 'Levels adjustment'],
    ['curves', 'Curves', 'Curves adjustment'],
    ['exposure', 'Exposure', 'Exposure adjustment'],
    ['vibrance', 'Vibrance', 'Vibrance adjustment'],
    ['hue/saturation', 'Hue/Saturation', 'Hue and saturation adjustment'],
    ['color balance', 'Color Balance', 'Color balance adjustment'],
    ['black & white', 'Black & White', 'Black and white adjustment'],
    ['photo filter', 'Photo Filter', 'Photo filter adjustment'],
    ['channel mixer', 'Channel Mixer', 'Channel mixer adjustment'],
    ['color lookup', 'Color Lookup', 'Color lookup adjustment'],
    ['invert', 'Invert', 'Invert adjustment'],
    ['posterize', 'Posterize', 'Posterize adjustment'],
    ['threshold', 'Threshold', 'Threshold adjustment'],
    ['gradient map', 'Gradient Map', 'Gradient map adjustment'],
    ['selective color', 'Selective Color', 'Selective color adjustment']
  ] as const satisfies readonly [AdjustmentType, string, string][])(
    'renames the raw %s Photopea default',
    (type, name, expected) => {
      expect(buildLayerRenamePlan([layer(name, 'adjustment', type)])).toEqual([{ path: [0], from: name, to: expected }])
    }
  )

  test('renames generic and duplicate layers deterministically in PSD order', () => {
    const layers = [
      layer('Portrait'),
      layer('portrait'),
      layer('Layer'),
      layer('Retouched pixels'),
      layer('Layer'),
      layer('Curves', 'adjustment', 'curves'),
      layer('curves 3', 'adjustment', 'curves'),
      layer('Group', 'group', undefined, [layer('Layer')]),
      layer('  Warm   highlights  '),
      layer('Cafe\u0301 tone'),
      layer('Detail group', 'group', undefined, [layer('Café tone')])
    ]

    const expected = [
      { path: [0], from: 'Portrait', to: 'Retouched pixels 2' },
      { path: [1], from: 'portrait', to: 'Retouched pixels 3' },
      { path: [2], from: 'Layer', to: 'Retouched pixels 4' },
      { path: [4], from: 'Layer', to: 'Retouched pixels 5' },
      { path: [5], from: 'Curves', to: 'Curves adjustment' },
      { path: [6], from: 'curves 3', to: 'Curves adjustment 2' },
      { path: [7], from: 'Group', to: 'Retouching group' },
      { path: [7, 0], from: 'Layer', to: 'Retouched pixels 6' },
      { path: [8], from: '  Warm   highlights  ', to: 'Warm highlights' },
      { path: [9], from: 'Cafe\u0301 tone', to: 'Retouched pixels 7' },
      { path: [10, 0], from: 'Café tone', to: 'Retouched pixels 8' }
    ]

    const plan = buildLayerRenamePlan(layers)
    expect(plan).toEqual(expected)
    expect(buildLayerRenamePlan(layers)).toEqual(plan)
    expect(buildLayerRenamePlan(applyRenamePlan(layers, plan))).toEqual([])
  })

  test('renames every duplicate fallback name', () => {
    expect(buildLayerRenamePlan([layer('Retouched pixels'), layer('Retouched pixels')])).toEqual([
      { path: [0], from: 'Retouched pixels', to: 'Retouched pixels 2' },
      { path: [1], from: 'Retouched pixels', to: 'Retouched pixels 3' }
    ])
  })
})

describe('assertLayerNames', () => {
  test('rejects a generic stored name', () => {
    expectInvalidLayerNames([layer('Layer')])
  })

  test('rejects a non-normalized stored name', () => {
    expectInvalidLayerNames([layer('  Warm   highlights  ')])
  })
})
