import { assertLayerNames } from './layer-names'
import type { LayerInfo } from './session'

export type LayerCompletionErrorCode = 'missing_editable_layer'

export class LayerCompletionError extends Error {
  constructor(
    readonly code: LayerCompletionErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'LayerCompletionError'
  }
}

export function assertCompleteLayerTree(layers: readonly LayerInfo[]): void {
  assertLayerNames(layers)

  const hasEditableLayer = (items: readonly LayerInfo[], ancestorsVisible: boolean): boolean => {
    for (const layer of items) {
      const visible = ancestorsVisible && layer.visible
      if (visible && (layer.kind === 'adjustment' || layer.masks.some((mask) => mask.enabled))) {
        return true
      }
      if (hasEditableLayer(layer.children, visible)) return true
    }
    return false
  }

  if (!hasEditableLayer(layers, true)) {
    throw new LayerCompletionError(
      'missing_editable_layer',
      'Completed edits require an enabled mask or visible adjustment.'
    )
  }
}
