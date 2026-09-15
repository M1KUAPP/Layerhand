import type { LayerInfo } from './session'

export function cloneLayerInfo(layer: LayerInfo): LayerInfo {
  return {
    name: layer.name,
    kind: layer.kind,
    visible: layer.visible,
    masks: layer.masks.map((mask) => ({ ...mask })),
    children: layer.children.map(cloneLayerInfo)
  }
}

export function cloneLayerTree(layers: readonly LayerInfo[]): LayerInfo[] {
  return layers.map(cloneLayerInfo)
}
