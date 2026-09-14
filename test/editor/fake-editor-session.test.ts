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

const documentOperations: ReadonlyArray<readonly [string, (session: FakeEditorSession) => Promise<unknown>]> = [
  ['screenshot', (session) => session.screenshot()],
  ['act', (session) => session.act([])],
  ['layers', (session) => session.layers()],
  ['exportPsd', (session) => session.exportPsd()],
  ['exportPreview', (session) => session.exportPreview()]
]

describe('FakeEditorSession', () => {
  test('rejects a recording with no frames', () => {
    expect(() => createSession(recording({ frames: [] }))).toThrow('Editor recording requires at least one frame')
  })

  test('records the opened image and makes close idempotent', async () => {
    const session = createSession()
    const image = Uint8Array.of(1, 2, 3)

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
  })

  for (const [operationName, operation] of documentOperations) {
    test(`${operationName} rejects before a document opens`, async () => {
      await expect(operation(createSession())).rejects.toThrow('Editor session is not open')
    })

    test(`${operationName} rejects after the session closes`, async () => {
      const session = createSession()
      await session.open(Uint8Array.of(1), 'portrait.jpg')
      await session.close()

      await expect(operation(session)).rejects.toThrow('Editor session is closed')
    })
  }

  test('copies Buffer-backed inputs and outputs without sharing memory', async () => {
    const sourceFrame = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1])
    const sourcePsd = Buffer.from([0x38, 0x42, 0x50, 0x53, 1])
    const sourcePreview = Buffer.from([0x89, 0x50, 0x4e, 0x47, 2])
    const openedImage = Buffer.from([1, 2, 3])
    const session = createSession(
      recording({
        frames: [sourceFrame],
        psd: sourcePsd,
        preview: sourcePreview
      })
    )

    await session.open(openedImage, 'portrait.jpg')
    sourceFrame.fill(0)
    sourcePsd.fill(0)
    sourcePreview.fill(0)
    openedImage.fill(0)

    expect(Array.from(session.openedImage!)).toEqual([1, 2, 3])
    expect(Array.from(await session.screenshot())).toEqual([0x89, 0x50, 0x4e, 0x47, 1])
    expect(Array.from(await session.exportPsd())).toEqual([0x38, 0x42, 0x50, 0x53, 1])
    expect(Array.from(await session.exportPreview())).toEqual([0x89, 0x50, 0x4e, 0x47, 2])

    const observedImage = session.openedImage!
    const observedFrame = await session.screenshot()
    const observedPsd = await session.exportPsd()
    const observedPreview = await session.exportPreview()
    observedImage.fill(0)
    observedFrame.fill(0)
    observedPsd.fill(0)
    observedPreview.fill(0)

    expect(Array.from(session.openedImage!)).toEqual([1, 2, 3])
    expect((await session.screenshot())[0]).toBe(0x89)
    expect((await session.exportPsd())[0]).toBe(0x38)
    expect((await session.exportPreview())[0]).toBe(0x89)
  })

  test('advances through frames and holds on the final frame', async () => {
    const session = createSession()
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    expect(await session.screenshot()).toEqual(frameA)
    expect(await session.screenshot()).toEqual(frameB)
    expect(await session.screenshot()).toEqual(frameB)
  })

  test('restarts the frame recording when another image opens', async () => {
    const session = createSession()
    await session.open(Uint8Array.of(1), 'portrait.jpg')
    await session.screenshot()
    expect(await session.screenshot()).toEqual(frameB)

    await session.open(Uint8Array.of(2), 'another-portrait.jpg')

    expect(await session.screenshot()).toEqual(frameA)
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
    await session.act([])
    await session.act([
      { type: 'type', text: 'Retouched copy' },
      { type: 'keypress', keys: ['ENTER'] }
    ])
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
      ],
      [],
      [
        { type: 'type', text: 'Retouched copy' },
        { type: 'keypress', keys: ['ENTER'] }
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
