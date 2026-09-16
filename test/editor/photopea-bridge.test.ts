import { describe, expect, spyOn, test } from 'bun:test'
import {
  PhotopeaBridge,
  type PhotopeaConfiguration,
  type PhotopeaMessage,
  type PhotopeaTransport
} from '../../src/editor'
import { FILE_TRANSFER_MS_PER_MIB } from '../../src/editor/photopea-bridge'

class MemoryTransport implements PhotopeaTransport {
  readonly viewport = { width: 1440, height: 900 }
  readonly sent: Array<string | Uint8Array> = []
  readonly bootConfigurations: PhotopeaConfiguration[] = []
  readonly pressed: string[] = []
  readonly messages: PhotopeaMessage[] = []
  reloads = 0

  async boot(configuration: PhotopeaConfiguration): Promise<void> {
    this.bootConfigurations.push(configuration)
  }

  async send(message: string | Uint8Array): Promise<void> {
    this.sent.push(typeof message === 'string' ? message : Uint8Array.from(message))
  }

  async nextMessage(_timeoutMs: number): Promise<PhotopeaMessage> {
    const message = this.messages.shift()
    if (!message) throw new Error('timeout')
    return message
  }

  async press(key: string): Promise<void> {
    this.pressed.push(key)
  }

  async reload(): Promise<void> {
    this.reloads += 1
  }
}

class ControlledTransport extends MemoryTransport {
  readonly #resolvers: Array<(message: PhotopeaMessage) => void> = []

  override async nextMessage(_timeoutMs: number): Promise<PhotopeaMessage> {
    return new Promise((resolve) => this.#resolvers.push(resolve))
  }

  resolveNext(message: PhotopeaMessage): void {
    const resolve = this.#resolvers.shift()
    if (!resolve) throw new Error('No pending Photopea message request.')
    resolve(message)
  }

  async waitForSentCount(count: number): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (this.sent.length >= count) return
      await Bun.sleep(0)
    }
    throw new Error(`Timed out waiting for ${count} sent messages.`)
  }

  async waitForMessageRequest(): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (this.#resolvers.length > 0) return
      await Bun.sleep(0)
    }
    throw new Error('Timed out waiting for a Photopea message request.')
  }
}

class LateSentinelTransport extends MemoryTransport {
  override async nextMessage(timeoutMs: number): Promise<PhotopeaMessage> {
    await Bun.sleep(timeoutMs + 1)
    return { type: 'text', value: 'sentinel-1' }
  }
}

describe('PhotopeaBridge', () => {
  test('reuses successful boot without consuming leftover command completion messages', async () => {
    const transport = new MemoryTransport()
    transport.messages.push({ type: 'text', value: 'done' })
    const bridge = new PhotopeaBridge(transport)
    await bridge.boot()
    transport.messages.push({ type: 'text', value: 'done' })

    await bridge.boot()

    expect(transport.bootConfigurations).toHaveLength(1)
    expect(transport.messages).toEqual([{ type: 'text', value: 'done' }])
  })

  test('shares one in-flight readiness wait across concurrent boot calls', async () => {
    const transport = new ControlledTransport()
    const bridge = new PhotopeaBridge(transport)
    let completed = 0
    const calls = [bridge.boot(), bridge.boot()].map((call) =>
      call.then(() => {
        completed += 1
      })
    )
    await transport.waitForMessageRequest()
    const attempts = transport.bootConfigurations.length
    const completedBeforeReadiness = completed

    for (let index = 0; index < attempts; index += 1) {
      await transport.waitForMessageRequest()
      transport.resolveNext({ type: 'text', value: 'done' })
    }
    await Promise.all(calls)

    expect(attempts).toBe(1)
    expect(completedBeforeReadiness).toBe(0)
    expect(completed).toBe(2)
  })

  test('serializes readiness with commands already using the message queue', async () => {
    const transport = new ControlledTransport()
    const bridge = new PhotopeaBridge(transport, { createSentinel: () => 'sentinel-1' })
    const command = bridge.runScript('first();')
    await transport.waitForMessageRequest()

    const boot = bridge.boot()
    await Bun.sleep(0)
    const bootsWhileCommandPending = transport.bootConfigurations.length
    transport.resolveNext({ type: 'text', value: 'sentinel-1' })
    await command
    await transport.waitForMessageRequest()
    transport.resolveNext({ type: 'text', value: 'done' })
    await boot

    expect(bootsWhileCommandPending).toBe(0)
    expect(transport.bootConfigurations).toHaveLength(1)
  })

  test('retries boot after navigation fails', async () => {
    const transport = new MemoryTransport()
    let attempts = 0
    transport.boot = async () => {
      attempts += 1
      if (attempts === 1) throw new Error('navigation failed')
      transport.messages.push({ type: 'text', value: 'done' })
    }
    const bridge = new PhotopeaBridge(transport)

    await expect(bridge.boot()).rejects.toThrow('navigation failed')
    await bridge.boot()
    expect(attempts).toBe(2)
  })

  test('retries boot after readiness times out', async () => {
    const transport = new MemoryTransport()
    const bridge = new PhotopeaBridge(transport)

    await expect(bridge.boot()).rejects.toMatchObject({ code: 'photopea_timeout' })
    transport.messages.push({ type: 'text', value: 'done' })
    await bridge.boot()

    expect(transport.bootConfigurations).toHaveLength(2)
    expect(transport.reloads).toBe(1)
  })

  test('requires fresh readiness after a command timeout reloads a booted editor', async () => {
    const transport = new MemoryTransport()
    transport.messages.push({ type: 'text', value: 'done' })
    const bridge = new PhotopeaBridge(transport)
    await bridge.boot()

    await expect(bridge.runScript('slow();')).rejects.toMatchObject({ code: 'photopea_timeout' })
    transport.messages.push({ type: 'text', value: 'done' })
    await bridge.boot()

    expect(transport.bootConfigurations).toHaveLength(2)
    expect(transport.messages).toEqual([])
  })

  test('waits for the exact sentinel and ignores misleading done messages', async () => {
    const transport = new MemoryTransport()
    transport.messages.push(
      { type: 'text', value: 'done' },
      { type: 'text', value: 'metadata' },
      { type: 'text', value: 'sentinel-1' },
      { type: 'text', value: 'done' }
    )
    const bridge = new PhotopeaBridge(transport, {
      createSentinel: () => 'sentinel-1'
    })

    const result = await bridge.runScript('app.echoToOE("metadata");')

    expect(result).toEqual([
      { type: 'text', value: 'done' },
      { type: 'text', value: 'metadata' }
    ])
    expect(transport.sent[0]).toBe('app.echoToOE("metadata");\napp.echoToOE("sentinel-1");')
  })

  test('serializes overlapping scripts', async () => {
    const transport = new ControlledTransport()
    const sentinels = ['sentinel-1', 'sentinel-2']
    const bridge = new PhotopeaBridge(transport, {
      createSentinel: () => sentinels.shift()!
    })

    const first = bridge.runScript('first();')
    const second = bridge.runScript('second();')
    await transport.waitForSentCount(1)
    expect(transport.sent).toHaveLength(1)

    await transport.waitForMessageRequest()
    transport.resolveNext({ type: 'text', value: 'sentinel-1' })
    await first
    await transport.waitForSentCount(2)
    expect(transport.sent[1]).toContain('second();')

    await transport.waitForMessageRequest()
    transport.resolveNext({ type: 'text', value: 'sentinel-2' })
    await second
  })

  test('serializes mixed file and script operations through the same queue', async () => {
    const transport = new ControlledTransport()
    const sentinels = ['sentinel-1', 'sentinel-2', 'sentinel-3']
    const bridge = new PhotopeaBridge(transport, {
      createSentinel: () => sentinels.shift()!
    })

    const first = bridge.openFile(Uint8Array.of(1, 2, 3))
    const second = bridge.runScript('second();')
    const third = bridge.openFile(Uint8Array.of(4, 5, 6))

    await transport.waitForMessageRequest()
    expect(transport.sent).toEqual([Uint8Array.of(1, 2, 3), 'app.echoToOE("sentinel-1");'])
    transport.resolveNext({ type: 'text', value: 'sentinel-1' })
    await first

    await transport.waitForMessageRequest()
    expect(transport.sent).toEqual([
      Uint8Array.of(1, 2, 3),
      'app.echoToOE("sentinel-1");',
      'second();\napp.echoToOE("sentinel-2");'
    ])
    transport.resolveNext({ type: 'text', value: 'script output' })
    await transport.waitForMessageRequest()
    expect(transport.sent).toHaveLength(3)
    transport.resolveNext({ type: 'text', value: 'sentinel-2' })
    expect(await second).toEqual([{ type: 'text', value: 'script output' }])

    await transport.waitForMessageRequest()
    expect(transport.sent).toEqual([
      Uint8Array.of(1, 2, 3),
      'app.echoToOE("sentinel-1");',
      'second();\napp.echoToOE("sentinel-2");',
      Uint8Array.of(4, 5, 6),
      'app.echoToOE("sentinel-3");'
    ])
    transport.resolveNext({ type: 'text', value: 'sentinel-3' })
    await third
  })

  test('translates a readiness timeout to the stable error and reloads once', async () => {
    const transport = new MemoryTransport()
    const bridge = new PhotopeaBridge(transport)

    await expect(bridge.boot()).rejects.toMatchObject({
      name: 'PhotopeaProtocolError',
      code: 'photopea_timeout',
      message: 'Photopea did not complete the command before the timeout.'
    })
    expect(transport.reloads).toBe(1)
    expect(transport.sent).toEqual([])
  })

  test('decreases timeout budgets across spurious messages without renewing the deadline', async () => {
    let clock = 1000
    const now = spyOn(Date, 'now').mockImplementation(() => clock)
    const transport = new MemoryTransport()
    const budgets: number[] = []
    const responses = [
      { elapsed: 20, message: { type: 'text', value: 'done' } },
      { elapsed: 35, message: { type: 'bytes', value: Uint8Array.of(1) } },
      { elapsed: 46, message: { type: 'text', value: 'sentinel-1' } }
    ] satisfies Array<{ elapsed: number; message: PhotopeaMessage }>
    transport.nextMessage = async (timeoutMs) => {
      budgets.push(timeoutMs)
      const response = responses.shift()!
      clock += response.elapsed
      return response.message
    }
    const bridge = new PhotopeaBridge(transport, {
      commandTimeoutMs: 100,
      createSentinel: () => 'sentinel-1'
    })

    try {
      await expect(bridge.runScript('slow();')).rejects.toMatchObject({ code: 'photopea_timeout' })
      expect(budgets).toEqual([100, 80, 45])
      expect(transport.reloads).toBe(1)
    } finally {
      now.mockRestore()
    }
  })

  test.each([
    ['a 4 MiB file', 'completes', 4 * 2 ** 20],
    ['a 1 KiB file', 'times out', 2 ** 10]
  ])('gives %s time to leave the page in proportion to its size, and %s', async (_label, outcome, byteLength) => {
    let clock = 1000
    const now = spyOn(Date, 'now').mockImplementation(() => clock)
    const transport = new MemoryTransport()
    const budgets: number[] = []
    const file = new Uint8Array(byteLength)
    // The file arrives 150 ms into a 100 ms budget, as a large export read out of a hosted browser would.
    const responses = [
      { elapsed: 150, message: { type: 'bytes', value: file } },
      { elapsed: 10, message: { type: 'text', value: 'sentinel-1' } }
    ] satisfies Array<{ elapsed: number; message: PhotopeaMessage }>
    transport.nextMessage = async (timeoutMs) => {
      budgets.push(timeoutMs)
      const response = responses.shift()!
      clock += response.elapsed
      return response.message
    }
    const bridge = new PhotopeaBridge(transport, {
      commandTimeoutMs: 100,
      createSentinel: () => 'sentinel-1'
    })

    try {
      const command = bridge.runScript('app.activeDocument.saveToOE("psd");')
      if (outcome === 'completes') {
        expect(await command).toEqual([{ type: 'bytes', value: file }])
        expect(budgets).toEqual([100, 100 - 150 + 4 * FILE_TRANSFER_MS_PER_MIB])
        expect(transport.reloads).toBe(0)
      } else {
        await expect(command).rejects.toMatchObject({ code: 'photopea_timeout' })
        expect(budgets).toEqual([100])
        expect(transport.reloads).toBe(1)
      }
    } finally {
      now.mockRestore()
    }
  })

  test('reloads after timeout without resending the file', async () => {
    const transport = new MemoryTransport()
    const bridge = new PhotopeaBridge(transport, {
      commandTimeoutMs: 1,
      createSentinel: () => 'sentinel-1'
    })

    await expect(bridge.openFile(Uint8Array.of(1, 2, 3))).rejects.toMatchObject({ code: 'photopea_timeout' })
    expect(transport.reloads).toBe(1)
    expect(transport.sent).toHaveLength(2)
  })

  test('rejects a sentinel received after the command deadline', async () => {
    const transport = new LateSentinelTransport()
    const bridge = new PhotopeaBridge(transport, {
      commandTimeoutMs: 10,
      createSentinel: () => 'sentinel-1'
    })

    await expect(bridge.runScript('late();')).rejects.toMatchObject({ code: 'photopea_timeout' })
    expect(transport.reloads).toBe(1)
  })
})
