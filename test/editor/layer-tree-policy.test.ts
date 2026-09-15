import { describe, expect, test } from 'bun:test'
import { assertCompleteLayerTree, LayerCompletionError, PhotopeaExportError, type LayerInfo } from '../../src/editor'

function layer(
  name: string,
  kind: LayerInfo['kind'] = 'raster',
  options: Partial<Pick<LayerInfo, 'visible' | 'masks' | 'children'>> = {}
): LayerInfo {
  return {
    name,
    kind,
    visible: true,
    masks: [],
    children: [],
    ...options
  }
}

function expectIncomplete(layers: readonly LayerInfo[]): void {
  try {
    assertCompleteLayerTree(layers)
    throw new Error('Expected an incomplete tree')
  } catch (error) {
    expect(error).toBeInstanceOf(LayerCompletionError)
    expect((error as LayerCompletionError).code).toBe('missing_editable_layer')
    expect((error as Error).message).toBe('Completed edits require an enabled mask or visible adjustment.')
  }
}

describe('assertCompleteLayerTree', () => {
  test('rejects empty, raster-only, disabled-mask, and hidden-mask trees', () => {
    expectIncomplete([])
    expectIncomplete([layer('Original photograph')])
    expectIncomplete([
      layer('Background isolation', 'raster', {
        masks: [{ kind: 'pixel', enabled: false }]
      })
    ])
    expectIncomplete([
      layer('Background isolation', 'raster', {
        visible: false,
        masks: [{ kind: 'pixel', enabled: true }]
      })
    ])
  })

  test('rejects a visible adjustment below a hidden group', () => {
    expectIncomplete([
      layer('Retouching group', 'group', {
        visible: false,
        children: [layer('Warm highlights', 'adjustment')]
      })
    ])
  })

  test('rejects duplicate normalized names before the completion policy', () => {
    try {
      assertCompleteLayerTree([layer('Original photograph'), layer('original photograph')])
      throw new Error('Expected invalid names')
    } catch (error) {
      expect(error).toBeInstanceOf(PhotopeaExportError)
      expect((error as PhotopeaExportError).code).toBe('photopea_invalid_layer_name')
    }
  })

  test('accepts enabled pixel and vector masks', () => {
    expect(() =>
      assertCompleteLayerTree([
        layer('Background isolation', 'raster', {
          masks: [{ kind: 'pixel', enabled: true }]
        })
      ])
    ).not.toThrow()
    expect(() =>
      assertCompleteLayerTree([
        layer('Subject selection', 'raster', {
          masks: [{ kind: 'vector', enabled: true }]
        })
      ])
    ).not.toThrow()
  })

  test('accepts an effectively visible adjustment at two nesting depths', () => {
    expect(() =>
      assertCompleteLayerTree([
        layer('Retouching group', 'group', {
          children: [
            layer('Fine tuning', 'group', {
              children: [layer('Warm highlights', 'adjustment')]
            })
          ]
        })
      ])
    ).not.toThrow()
  })
})
