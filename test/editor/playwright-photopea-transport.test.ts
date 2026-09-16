import { describe, expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import type { Page } from 'playwright-core'
import { PHOTOPEA_CONFIGURATION, PlaywrightPhotopeaTransport, decodePhotopeaWireMessage } from '../../src/editor'
import { FILE_SLICE_BYTES } from '../../src/editor/playwright-photopea-transport'

interface PageFakeState {
  readonly navigations: string[]
  readonly evaluations: unknown[]
  readonly waitTimeouts: number[]
  readonly pressed: string[]
  readonly messages: unknown[]
  readonly received: unknown[]
  readonly messageLifecycle: string[]
  viewport: { width: number; height: number }
  readonly navigationViewports: Array<{ width: number; height: number }>
  reloads: number
}

function createPageFake() {
  const state: PageFakeState = {
    navigations: [],
    evaluations: [],
    waitTimeouts: [],
    pressed: [],
    messages: [],
    received: [],
    messageLifecycle: [],
    viewport: { width: 800, height: 600 },
    navigationViewports: [],
    reloads: 0
  }
  const host = {
    Uint8Array,
    atob,
    btoa,
    window: {
      __layerhandPhotopeaMessages: state.messages,
      __layerhandSendToPhotopea: (message: unknown) => state.received.push(message)
    }
  }

  return Object.assign(state, {
    goto: async (url: string): Promise<unknown> => {
      state.navigations.push(url)
      state.navigationViewports.push({ ...state.viewport })
      return undefined
    },
    setViewportSize: async (viewport: { width: number; height: number }) => {
      state.viewport = { ...viewport }
    },
    evaluate: async (callback: Function, argument?: unknown): Promise<unknown> => {
      state.evaluations.push(argument)
      state.messageLifecycle.push('evaluate')
      return runInNewContext(`(${callback.toString()})(argument)`, { ...host, argument })
    },
    waitForFunction: async (callback: Function, argument: unknown, options: { timeout: number }) => {
      state.waitTimeouts.push(options.timeout)
      const ready = runInNewContext(`(${callback.toString()})(argument)`, { ...host, argument })
      if (!ready) throw new Error('Host message wait timed out.')
      return {
        dispose: async () => {
          await Promise.resolve()
          state.messageLifecycle.push('dispose')
        }
      }
    },
    reload: async () => {
      state.reloads += 1
    },
    keyboard: {
      press: async (key: string) => {
        state.pressed.push(key)
      }
    }
  })
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
    page.evaluate = async (callback: Function, argument?: unknown) => {
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
    }
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })
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

  test('reads an exported file out of the page in bounded slices of compact base64, byte for byte', async () => {
    const page = createPageFake()
    // Every byte value, across two whole slices and a partial last one.
    const exported = Uint8Array.from({ length: FILE_SLICE_BYTES * 2 + 100_000 }, (_, index) => (index * 7) % 256)
    page.messages.push({ type: 'bytes', value: exported }, { type: 'text', value: 'after the file' })
    const replyLengths: number[] = []
    const evaluate = page.evaluate
    page.evaluate = async (callback: Function, argument?: unknown) => {
      const result = await evaluate(callback, argument)
      replyLengths.push(JSON.stringify(result ?? null).length)
      return result
    }
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    const message = await transport.nextMessage(750)

    expect(message).toEqual({ type: 'bytes', value: exported })
    // A CDP connection closes on one message over 256 MiB, so no reply may carry the whole file (#100).
    expect(replyLengths.filter((length) => length > 128)).toHaveLength(3)
    expect(Math.max(...replyLengths)).toBeLessThan(FILE_SLICE_BYTES * 1.4 + 128)
    expect(page.messages).toEqual([{ type: 'text', value: 'after the file' }])
  })

  test('rejects a file slice that is not exactly the base64 of its bytes', async () => {
    // The page's slice of Uint8Array.of(1, 2, 3) is AQID: short, long, padded early, or not text at all.
    for (const value of [['x'], new Array(2), [1, 2, 3], undefined, 'AQI', 'AQID!', 'AQ=D', 'AQIDBA==']) {
      const page = createPageFake()
      page.messages.push({ type: 'bytes', value: Uint8Array.of(1, 2, 3) })
      const evaluate = page.evaluate
      page.evaluate = async (callback: Function, argument?: unknown) => {
        const result = await evaluate(callback, argument)
        return typeof result === 'string' ? value : result
      }
      const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
        hostUrl: 'http://127.0.0.1:4123/editor'
      })

      await expect(transport.nextMessage(750)).rejects.toThrow('Photopea host returned an invalid message.')
    }
  })

  test('releases the parked file when a slice read fails, so cleanup does not depend on success', async () => {
    const page = createPageFake()
    page.messages.push({ type: 'bytes', value: Uint8Array.of(1, 2, 3) })
    const evaluate = page.evaluate
    page.evaluate = async (callback: Function, argument?: unknown) => {
      const result = await evaluate(callback, argument)
      // Corrupt only the slice reply; the head-shift and cleanup calls do not return strings.
      return typeof result === 'string' ? 'not base64 at all' : result
    }
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    await expect(transport.nextMessage(750)).rejects.toThrow('Photopea host returned an invalid message.')

    // head-shift, the failed slice, then cleanup: the parked file must not outlive a thrown slice read.
    // toHaveLength is load-bearing here: toEqual treats a missing trailing element as equal to undefined.
    expect(page.evaluations).toHaveLength(3)
    expect(page.evaluations[1]).toEqual([0, 3])
    expect(page.evaluations[2]).toBeUndefined()
  })

  test('reads an empty file without asking the page for a slice', async () => {
    const page = createPageFake()
    page.messages.push({ type: 'bytes', value: new Uint8Array() })
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    // The exporter's signature checks reject an empty file later.
    expect(await transport.nextMessage(750)).toEqual({ type: 'bytes', value: new Uint8Array() })
    expect(page.evaluations.filter((argument) => Array.isArray(argument))).toEqual([])
  })

  test('decodes text messages', () => {
    expect(decodePhotopeaWireMessage({ type: 'text', value: 'done' })).toEqual({
      type: 'text',
      value: 'done'
    })
  })

  test('rejects malformed host messages', () => {
    // A file never arrives whole: it is read out of the page in slices.
    for (const value of [undefined, 'done', { type: 'text' }, { type: 'bytes', value: 'AQID' }]) {
      expect(() => decodePhotopeaWireMessage(value)).toThrow('Photopea host returned an invalid message.')
    }
  })

  test('boots the configured non-opaque host URL', async () => {
    const page = createPageFake()
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    await transport.boot(PHOTOPEA_CONFIGURATION)

    const navigated = new URL(page.navigations[0]!)
    expect(navigated.origin).toBe('http://127.0.0.1:4123')
    expect(JSON.parse(decodeURIComponent(navigated.hash.slice(1)))).toEqual(PHOTOPEA_CONFIGURATION)
  })

  test.each([
    [undefined, { width: 1440, height: 900 }],
    [
      { width: 1280, height: 720 },
      { width: 1280, height: 720 }
    ]
  ])('applies viewport %j before the host loads', async (viewport, expected) => {
    const page = createPageFake()
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor',
      ...(viewport ? { viewport } : {})
    })

    await transport.boot(PHOTOPEA_CONFIGURATION)

    expect(page.viewport).toEqual(expected)
    expect(page.navigationViewports).toEqual([expected])
    expect(transport.viewport).toEqual(expected)
  })

  test('reloads after same-document navigation so old messages cannot mark a new boot ready', async () => {
    const page = createPageFake()
    page.messages.push({ type: 'text', value: 'done' })
    page.goto = async () => null
    page.reload = async () => {
      page.reloads += 1
      page.messages.splice(0)
    }
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    await transport.boot(PHOTOPEA_CONFIGURATION)

    expect(page.reloads).toBe(1)
    await expect(transport.nextMessage(100)).rejects.toThrow('Host message wait timed out.')
  })

  test('rejects opaque and non-HTTP host URLs', () => {
    const page = createPageFake()

    for (const hostUrl of ['about:blank', 'data:text/html,editor', 'file:///tmp/editor.html']) {
      expect(() => new PlaywrightPhotopeaTransport(page as unknown as Page, { hostUrl })).toThrow(
        'Photopea host URL must use HTTP or HTTPS.'
      )
    }
  })

  test('adapts page messaging, keyboard, timeout, and reload operations', async () => {
    const page = createPageFake()
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor',
      viewport: { width: 1280, height: 720 }
    })

    await transport.send(Uint8Array.of(1, 2, 3))
    await transport.send('app.activeDocument.name')
    page.messages.push({ type: 'text', value: 'done' })

    expect(await transport.nextMessage(750)).toEqual({ type: 'text', value: 'done' })
    await transport.press('V')
    await transport.reload()

    expect(page.evaluations[0]).toEqual({ type: 'bytes', value: 'AQID' })
    expect(page.evaluations[1]).toEqual({ type: 'text', value: 'app.activeDocument.name' })
    expect(page.received).toEqual([
      { type: 'bytes', value: Uint8Array.of(1, 2, 3) },
      { type: 'text', value: 'app.activeDocument.name' }
    ])
    expect(page.waitTimeouts).toEqual([750])
    expect(page.pressed).toEqual(['V'])
    expect(page.reloads).toBe(1)
    expect(transport.viewport).toEqual({ width: 1280, height: 720 })
  })

  test('shifts exactly one queued host message and leaves the next', async () => {
    const page = createPageFake()
    page.messages.push({ type: 'text', value: 'first' }, { type: 'bytes', value: Uint8Array.of(4, 5) })
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    expect(await transport.nextMessage(750)).toEqual({ type: 'text', value: 'first' })
    expect(page.messages).toEqual([{ type: 'bytes', value: Uint8Array.of(4, 5) }])
    expect(page.waitTimeouts).toEqual([750])
  })

  test('disposes its wait handle once before shifting a queued message', async () => {
    const page = createPageFake()
    page.messages.push({ type: 'text', value: 'done' })
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    expect(await transport.nextMessage(750)).toEqual({ type: 'text', value: 'done' })
    expect(page.messageLifecycle).toEqual(['dispose', 'evaluate'])
  })

  test('waits for a non-empty host message queue before reading it', async () => {
    const page = createPageFake()
    const transport = new PlaywrightPhotopeaTransport(page as unknown as Page, {
      hostUrl: 'http://127.0.0.1:4123/editor'
    })

    await expect(transport.nextMessage(125)).rejects.toThrow('Host message wait timed out.')
    expect(page.evaluations).toEqual([])
    expect(page.waitTimeouts).toEqual([125])
  })
})
