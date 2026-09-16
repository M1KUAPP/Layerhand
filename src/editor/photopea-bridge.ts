import { PHOTOPEA_CONFIGURATION, type PhotopeaMessage, type PhotopeaTransport } from './photopea-transport'

const DEFAULT_COMMAND_TIMEOUT_MS = 30_000

/**
 * What a command's wait grows by for each MiB of file it receives. Reading a
 * file out of a hosted browser takes time in proportion to its size, and a
 * wait that runs out reloads the editor and loses the document (#100).
 */
export const FILE_TRANSFER_MS_PER_MIB = 1_000

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
  /**
   * Message-wait budget, grown for each file received; excludes navigation,
   * sends, and awaited reload cleanup.
   */
  readonly commandTimeoutMs?: number
  readonly createSentinel?: () => string
}

export class PhotopeaBridge {
  readonly #transport: PhotopeaTransport
  readonly #commandTimeoutMs: number
  readonly #createSentinel: () => string
  #tail: Promise<void> = Promise.resolve()
  #bootState: Promise<void> | 'ready' | undefined

  constructor(transport: PhotopeaTransport, options: PhotopeaBridgeOptions = {}) {
    this.#transport = transport
    this.#commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS
    this.#createSentinel = options.createSentinel ?? (() => `layerhand-${crypto.randomUUID()}`)
  }

  boot(): Promise<void> {
    if (this.#bootState) {
      return this.#bootState === 'ready' ? Promise.resolve() : this.#bootState
    }

    const boot = this.#enqueue(async () => {
      await this.#transport.boot(PHOTOPEA_CONFIGURATION)
      await this.#waitForText('done')
    })
    this.#bootState = boot
    void boot.then(
      () => {
        this.#bootState = 'ready'
      },
      () => {
        this.#bootState = undefined
      }
    )
    return boot
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
    let deadline = Date.now() + this.#commandTimeoutMs

    while (true) {
      const remainingMs = deadline - Date.now()
      if (remainingMs <= 0) return this.#throwTimeout()

      let message: PhotopeaMessage
      try {
        message = await this.#transport.nextMessage(remainingMs)
      } catch {
        return this.#throwTimeout()
      }
      if (message.type === 'bytes') {
        deadline += Math.floor((message.value.byteLength / 2 ** 20) * FILE_TRANSFER_MS_PER_MIB)
      }
      if (Date.now() >= deadline) return this.#throwTimeout()
      if (message.type === 'text' && message.value === value) return messages
      messages.push(message)
    }
  }

  async #throwTimeout(): Promise<never> {
    if (this.#bootState === 'ready') this.#bootState = undefined
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
