import { describe, expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import type { Page } from 'playwright-core'
import { PHOTOPEA_CONFIGURATION, PlaywrightPhotopeaTransport, decodePhotopeaWireMessage } from '../../src/editor'

interface PageFakeState {
  readonly navigations: string[]
  readonly evaluations: unknown[]
  readonly waitTimeouts: number[]
  readonly pressed: string[]
  reloads: number
  nextWire: unknown
}

function createPageFake(): Page & PageFakeState {
  const state: PageFakeState & Record<string, unknown> = {
    navigations: [],
    evaluations: [],
    waitTimeouts: [],
    pressed: [],
    reloads: 0,
    nextWire: undefined
  }

  state.goto = async (url: string) => {
    state.navigations.push(url)
  }
  state.evaluate = async (_callback: unknown, argument?: unknown) => {
    state.evaluations.push(argument)
    const result = state.nextWire
    state.nextWire = undefined
    return result
  }
  state.waitForFunction = async (...args: unknown[]) => {
    const options = args.at(-1) as { timeout?: number } | undefined
    state.waitTimeouts.push(options?.timeout ?? -1)
  }
  state.reload = async () => {
    state.reloads += 1
  }
  state.keyboard = {
    press: async (key: string) => {
      state.pressed.push(key)
    }
  }

  return state as unknown as Page & PageFakeState
}

describe('Playwright Photopea transport', () => {
  test('sends compact binary payloads while preserving every byte and copying input slices', async () => {
    const page = createPageFake()
    let resume!: () => void
    const ready = new Promise<void>((resolve) => {
      resume = resolve
    })
    let serializedBytes = 0
    let received: { type: string; value: ArrayLike<number> } | undefined
    page.evaluate = (async (callback: Function, argument: unknown) => {
      serializedBytes = JSON.stringify(argument).length
      await ready
      runInNewContext(`(${callback.toString()})(argument)`, {
        argument,
        Uint8Array,
        atob,
        window: {
          __layerhandSendToPhotopea: (message: typeof received) => {
            received = message
          }
        }
      })
    }) as Page['evaluate']
    const transport = new PlaywrightPhotopeaTransport(page, { hostUrl: 'http://127.0.0.1:4123/editor' })
    const expected = Uint8Array.from({ length: 256 }, (_, index) => index)
    const backing = Buffer.concat([Buffer.from([9]), expected, Buffer.from([8])])
    const input = backing.subarray(1, 257)

    const pending = transport.send(input)
    input.fill(9)
    resume()
    await pending

    expect(received?.type).toBe('bytes')
    expect(Uint8Array.from(received!.value)).toEqual(expected)
    expect(serializedBytes).toBeLessThan(expected.byteLength * 2 + 128)
  })

  test('decodes copied text and byte messages', () => {
    expect(decodePhotopeaWireMessage({ type: 'text', value: 'done' })).toEqual({
      type: 'text',
      value: 'done'
    })
    const wire = { type: 'bytes', value: [1, 2, 3] }
    const decoded = decodePhotopeaWireMessage(wire)
    wire.value[0] = 9
    expect(decoded).toEqual({ type: 'bytes', value: Uint8Array.of(1, 2, 3) })
  })

  test('rejects malformed host messages', () => {
    expect(() => decodePhotopeaWireMessage({ type: 'bytes', value: ['x'] })).toThrow(
      'Photopea host returned an invalid message.'
    )
    expect(() => decodePhotopeaWireMessage({ type: 'bytes', value: new Array(2) })).toThrow(
      'Photopea host returned an invalid message.'
    )
  })

  test('boots the configured non-opaque host URL', async () => {
    const page = createPageFake()
    const transport = new PlaywrightPhotopeaTransport(page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    await transport.boot(PHOTOPEA_CONFIGURATION)

    const navigated = new URL(page.navigations[0]!)
    expect(navigated.origin).toBe('http://127.0.0.1:4123')
    expect(JSON.parse(decodeURIComponent(navigated.hash.slice(1)))).toEqual(PHOTOPEA_CONFIGURATION)
  })

  test('rejects opaque and non-HTTP host URLs', () => {
    const page = createPageFake()

    for (const hostUrl of ['about:blank', 'data:text/html,editor', 'file:///tmp/editor.html']) {
      expect(() => new PlaywrightPhotopeaTransport(page, { hostUrl })).toThrow(
        'Photopea host URL must use HTTP or HTTPS.'
      )
    }
  })

  test('adapts page messaging, keyboard, timeout, and reload operations', async () => {
    const page = createPageFake()
    const transport = new PlaywrightPhotopeaTransport(page, {
      hostUrl: 'http://127.0.0.1:4123/editor',
      viewport: { width: 1280, height: 720 }
    })

    await transport.send(Uint8Array.of(1, 2, 3))
    await transport.send('app.activeDocument.name')
    page.nextWire = { type: 'text', value: 'done' }

    expect(await transport.nextMessage(750)).toEqual({ type: 'text', value: 'done' })
    await transport.press('V')
    await transport.reload()

    expect(page.evaluations[0]).toEqual({ type: 'bytes', value: 'AQID' })
    expect(page.evaluations[1]).toEqual({ type: 'text', value: 'app.activeDocument.name' })
    expect(page.waitTimeouts).toEqual([750])
    expect(page.pressed).toEqual(['V'])
    expect(page.reloads).toBe(1)
    expect(transport.viewport).toEqual({ width: 1280, height: 720 })
  })
})
