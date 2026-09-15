import { PhotopeaExportError } from './photopea-export-error'
import type { AdjustmentType, ParsedLayerInfo } from './psd-metadata'
import type { LayerInfo } from './session'

export type LayerPath = readonly number[]

export interface LayerRename {
  readonly path: LayerPath
  readonly from: string
  readonly to: string
}

const ADJUSTMENT_LABELS: Readonly<Record<AdjustmentType, string>> = {
  'brightness/contrast': 'Brightness and contrast',
  levels: 'Levels',
  curves: 'Curves',
  exposure: 'Exposure',
  vibrance: 'Vibrance',
  'hue/saturation': 'Hue and saturation',
  'color balance': 'Color balance',
  'black & white': 'Black and white',
  'photo filter': 'Photo filter',
  'channel mixer': 'Channel mixer',
  'color lookup': 'Color lookup',
  invert: 'Invert',
  posterize: 'Posterize',
  threshold: 'Threshold',
  'gradient map': 'Gradient map',
  'selective color': 'Selective color'
}

const ADJUSTMENT_DEFAULT_NAMES: Readonly<Record<AdjustmentType, string>> = {
  'brightness/contrast': 'Brightness/Contrast',
  levels: 'Levels',
  curves: 'Curves',
  exposure: 'Exposure',
  vibrance: 'Vibrance',
  'hue/saturation': 'Hue/Saturation',
  'color balance': 'Color Balance',
  'black & white': 'Black & White',
  'photo filter': 'Photo Filter',
  'channel mixer': 'Channel Mixer',
  'color lookup': 'Color Lookup',
  invert: 'Invert',
  posterize: 'Posterize',
  threshold: 'Threshold',
  'gradient map': 'Gradient Map',
  'selective color': 'Selective Color'
}

const DEFAULT_ADJUSTMENT_NAMES = new Set(Object.values(ADJUSTMENT_DEFAULT_NAMES).map((name) => name.toLowerCase()))

interface IndexedLayer {
  readonly layer: ParsedLayerInfo
  readonly path: LayerPath
  readonly normalizedName: string
  readonly key: string
  readonly generic: boolean
}

export function normalizeLayerName(name: string): string {
  return name.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

function nameKey(name: string): string {
  return normalizeLayerName(name).toLowerCase()
}

function hasDefaultAdjustmentName(name: string): boolean {
  const match = /^(.*?)(?: \d+)?$/u.exec(name.toLowerCase())
  return match !== null && DEFAULT_ADJUSTMENT_NAMES.has(match[1]!)
}

function isGenericLayerName(name: string): boolean {
  const normalized = normalizeLayerName(name)
  return (
    !/\p{L}/u.test(normalized) ||
    /^(?:layer|group)(?: \d+)?$/iu.test(normalized) ||
    hasDefaultAdjustmentName(normalized) ||
    /(?:^| )copy(?: \d+)?$/iu.test(normalized)
  )
}

function flattenLayers(layers: readonly ParsedLayerInfo[], path: LayerPath = []): IndexedLayer[] {
  return layers.flatMap((layer, index) => {
    const layerPath = [...path, index]
    const normalizedName = normalizeLayerName(layer.name)
    return [
      {
        layer,
        path: layerPath,
        normalizedName,
        key: normalizedName.toLowerCase(),
        generic: isGenericLayerName(normalizedName)
      },
      ...flattenLayers(layer.children, layerPath)
    ]
  })
}

function fallbackName(layer: ParsedLayerInfo): string {
  if (layer.kind === 'group') return 'Retouching group'
  if (layer.kind === 'adjustment') {
    return layer.adjustmentType ? `${ADJUSTMENT_LABELS[layer.adjustmentType]} adjustment` : 'Adjustment'
  }
  return 'Retouched pixels'
}

function firstFreeName(base: string, used: Set<string>): string {
  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base} ${suffix}`
    const key = nameKey(candidate)
    if (!used.has(key)) {
      used.add(key)
      return candidate
    }
  }
}

export function buildLayerRenamePlan(layers: readonly ParsedLayerInfo[]): readonly LayerRename[] {
  const flattened = flattenLayers(layers)
  const counts = new Map<string, number>()
  for (const item of flattened) counts.set(item.key, (counts.get(item.key) ?? 0) + 1)

  const reserved = new Set<string>()
  for (const item of flattened) {
    if (!item.generic && counts.get(item.key) === 1) reserved.add(item.key)
  }

  const plan: LayerRename[] = []
  for (const item of flattened) {
    if (!item.generic && counts.get(item.key) === 1) {
      if (item.layer.name !== item.normalizedName) {
        plan.push({ path: item.path, from: item.layer.name, to: item.normalizedName })
      }
      continue
    }

    const to = firstFreeName(fallbackName(item.layer), reserved)
    plan.push({ path: item.path, from: item.layer.name, to })
  }

  return plan
}

export function assertLayerNames(layers: readonly LayerInfo[]): void {
  const seen = new Set<string>()
  const visit = (items: readonly LayerInfo[]): void => {
    for (const layer of items) {
      const normalizedName = normalizeLayerName(layer.name)
      const key = normalizedName.toLowerCase()
      if (layer.name !== normalizedName || isGenericLayerName(normalizedName) || seen.has(key)) {
        throw new PhotopeaExportError(
          'photopea_invalid_layer_name',
          'Photopea returned a generic, duplicate, or non-normalized layer name.'
        )
      }
      seen.add(key)
      visit(layer.children)
    }
  }

  visit(layers)
}
