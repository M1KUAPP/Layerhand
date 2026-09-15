import { readPsd, type Layer } from 'ag-psd'
import { cloneLayerTree } from './layer-tree'
import { PhotopeaExportError } from './photopea-export-error'
import type { LayerInfo, LayerMaskInfo } from './session'

export type AdjustmentType =
  | 'brightness/contrast'
  | 'levels'
  | 'curves'
  | 'exposure'
  | 'vibrance'
  | 'hue/saturation'
  | 'color balance'
  | 'black & white'
  | 'photo filter'
  | 'channel mixer'
  | 'color lookup'
  | 'invert'
  | 'posterize'
  | 'threshold'
  | 'gradient map'
  | 'selective color'

export interface ParsedLayerInfo extends LayerInfo {
  readonly adjustmentType?: AdjustmentType
  readonly children: readonly ParsedLayerInfo[]
}

export interface ParsedPsdMetadata {
  readonly width: number
  readonly height: number
  readonly layers: readonly ParsedLayerInfo[]
}

const READ_OPTIONS = {
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
  skipLinkedFilesData: true
} as const

function layerMasks(layer: Layer): LayerMaskInfo[] {
  const masks: LayerMaskInfo[] = []
  const pixelMask = layer.realMask ?? (layer.mask?.fromVectorData ? undefined : layer.mask)

  if (pixelMask) masks.push({ kind: 'pixel', enabled: !pixelMask.disabled })
  if (layer.vectorMask) masks.push({ kind: 'vector', enabled: !layer.vectorMask.disable })

  return masks
}

function parsedLayer(layer: Layer): ParsedLayerInfo {
  const children = layer.children?.map(parsedLayer) ?? []
  const kind = layer.children !== undefined ? 'group' : layer.adjustment ? 'adjustment' : 'raster'

  return {
    name: layer.name ?? '',
    kind,
    visible: !layer.hidden,
    masks: layerMasks(layer),
    children,
    ...(layer.adjustment ? { adjustmentType: layer.adjustment.type } : {})
  }
}

export function parsePsdMetadata(bytes: Uint8Array): ParsedPsdMetadata {
  try {
    const psd = readPsd(Uint8Array.from(bytes), READ_OPTIONS)

    return {
      width: psd.width,
      height: psd.height,
      layers: (psd.children ?? []).map(parsedLayer)
    }
  } catch {
    throw new PhotopeaExportError('photopea_invalid_psd', 'Photopea returned invalid PSD bytes.')
  }
}

export function toLayerInfoTree(layers: readonly ParsedLayerInfo[]): LayerInfo[] {
  return cloneLayerTree(layers)
}
