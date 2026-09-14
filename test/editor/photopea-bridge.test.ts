import { describe, expect, test } from 'bun:test'
import {
  PhotopeaBridge,
  type PhotopeaConfiguration,
  type PhotopeaMessage,
  type PhotopeaTransport
} from '../../src/editor'

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

  async nextMessage(): Promise<PhotopeaMessage> {
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

  override async nextMessage(): Promise<PhotopeaMessage> {
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

describe('PhotopeaBridge', () => {
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
})
