import { describe, expect, test } from 'bun:test'
import { FakeEditorSession, type EditorRecording } from '../../src/editor/fake-editor-session'
import type { ComputerAction } from '../../src/editor/session'

const frameA = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 1)
const frameB = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 2)
const psd = Uint8Array.of(0x38, 0x42, 0x50, 0x53, 1)

function recording(overrides: Partial<EditorRecording> = {}): EditorRecording {
  return {
    frames: [frameA, frameB],
    psd,
    preview: frameB,
    layers: [
      { name: 'Original photograph', kind: 'raster', visible: true },
      { name: 'Retouched copy', kind: 'raster', visible: true }
    ],
    ...overrides
  }
}

function createSession(source = recording()) {
  return new FakeEditorSession({
    id: 'fake-1',
    viewport: { width: 1440, height: 900 },
    recording: source
  })
}

describe('FakeEditorSession', () => {
  test('rejects a recording with no frames', () => {
    expect(() => createSession(recording({ frames: [] }))).toThrow('Editor recording requires at least one frame')
  })

  test('enforces its lifecycle and records the opened image', async () => {
    const session = createSession()
    const image = Uint8Array.of(1, 2, 3)

    await expect(session.screenshot()).rejects.toThrow('Editor session is not open')
    await session.open(image, 'portrait.jpg')
    image[0] = 9

    expect(session.openedImage).toEqual(Uint8Array.of(1, 2, 3))
    expect(session.openedFilename).toBe('portrait.jpg')

    const observed = session.openedImage
    observed![0] = 8
    expect(session.openedImage).toEqual(Uint8Array.of(1, 2, 3))

    await session.close()
    await session.close()
    await expect(session.open(Uint8Array.of(4), 'again.jpg')).rejects.toThrow('Editor session is closed')
    await expect(session.exportPsd()).rejects.toThrow('Editor session is closed')
  })

  test('advances through frames and holds on the final frame', async () => {
    const session = createSession()
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    expect(await session.screenshot()).toEqual(frameA)
    expect(await session.screenshot()).toEqual(frameB)
    expect(await session.screenshot()).toEqual(frameB)
  })

  test('preserves action batches and action order', async () => {
    const session = createSession()
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    const drag: Extract<ComputerAction, { type: 'drag' }> = {
      type: 'drag',
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 40 }
      ],
      keys: ['SHIFT']
    }
    const click: ComputerAction = {
      type: 'click',
      button: 'left',
      x: 50,
      y: 60
    }

    await session.act([drag, click])
    drag.path[0]!.x = 999
    drag.keys!.push('ALT')

    expect(session.actionBatches).toEqual([
      [
        {
          type: 'drag',
          path: [
            { x: 10, y: 20 },
            { x: 30, y: 40 }
          ],
          keys: ['SHIFT']
        },
        click
      ]
    ])

    const observed = session.actionBatches
    const observedDrag = observed[0]![0] as Extract<ComputerAction, { type: 'drag' }>
    observedDrag.path[0]!.x = 777
    expect(session.actionBatches[0]![0]).toMatchObject({
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 40 }
      ]
    })
  })

  test('returns defensive export and layer copies', async () => {
    const session = createSession(recording({ frames: [frameA] }))
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    const screenshot = await session.screenshot()
    const exportedPsd = await session.exportPsd()
    const preview = await session.exportPreview()
    const layers = await session.layers()
    screenshot[0] = 0
    exportedPsd[0] = 0
    preview[0] = 0
    layers[0]!.name = 'Changed'

    expect(await session.screenshot()).toEqual(frameA)
    expect(await session.exportPsd()).toEqual(psd)
    expect(await session.exportPreview()).toEqual(frameB)
    expect((await session.layers())[0]!.name).toBe('Original photograph')
  })
})
