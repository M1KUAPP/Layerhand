import { PHOTOPEA_CONFIGURATION, type PhotopeaMessage, type PhotopeaTransport } from './photopea-transport'

const DEFAULT_COMMAND_TIMEOUT_MS = 30_000

export type PhotopeaProtocolErrorCode = 'photopea_timeout' | 'photopea_protocol_error'

export class PhotopeaProtocolError extends Error {
  readonly code: PhotopeaProtocolErrorCode

  constructor(code: PhotopeaProtocolErrorCode, message: string) {
    super(message)
    this.name = 'PhotopeaProtocolError'
    this.code = code
  }
}

export interface PhotopeaBridgeOptions {
  readonly commandTimeoutMs?: number
  readonly createSentinel?: () => string
}

export class PhotopeaBridge {
  readonly #transport: PhotopeaTransport
  readonly #commandTimeoutMs: number
  readonly #createSentinel: () => string
  #tail: Promise<void> = Promise.resolve()

  constructor(transport: PhotopeaTransport, options: PhotopeaBridgeOptions = {}) {
    this.#transport = transport
    this.#commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS
    this.#createSentinel = options.createSentinel ?? (() => `layerhand-${crypto.randomUUID()}`)
  }

  async boot(): Promise<void> {
    await this.#transport.boot(PHOTOPEA_CONFIGURATION)
    await this.#waitForText('done')
  }

  async openFile(bytes: Uint8Array): Promise<void> {
    const copy = Uint8Array.from(bytes)
    return this.#enqueue(async () => {
      const sentinel = this.#createSentinel()
      await this.#transport.send(copy)
      await this.#transport.send(`app.echoToOE("${sentinel}");`)
      await this.#waitForText(sentinel)
    })
  }

  async runScript(script: string): Promise<readonly PhotopeaMessage[]> {
    return this.#enqueue(async () => {
      const sentinel = this.#createSentinel()
      await this.#transport.send(`${script}\napp.echoToOE("${sentinel}");`)
      return this.#waitForText(sentinel)
    })
  }

  async press(key: string): Promise<void> {
    await this.#transport.press(key)
  }

  async #waitForText(value: string): Promise<PhotopeaMessage[]> {
    const messages: PhotopeaMessage[] = []
    const deadline = Date.now() + this.#commandTimeoutMs

    while (true) {
      const remainingMs = deadline - Date.now()
      if (remainingMs <= 0) return this.#throwTimeout()

      let message: PhotopeaMessage
      try {
        message = await this.#transport.nextMessage(remainingMs)
      } catch {
        return this.#throwTimeout()
      }
      if (Date.now() >= deadline) return this.#throwTimeout()
      if (message.type === 'text' && message.value === value) return messages
      messages.push(message)
    }
  }

  async #throwTimeout(): Promise<never> {
    try {
      await this.#transport.reload()
    } catch {
      // The protocol error remains stable even if cleanup fails.
    }
    throw new PhotopeaProtocolError('photopea_timeout', 'Photopea did not complete the command before the timeout.')
  }

  #enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#tail.then(operation, operation)
    this.#tail = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }
}
