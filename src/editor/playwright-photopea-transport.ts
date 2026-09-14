import type { Page } from 'playwright-core'
import type { Viewport } from './session'
import type { PhotopeaConfiguration, PhotopeaMessage, PhotopeaTransport } from './photopea-transport'

const DEFAULT_VIEWPORT: Viewport = { width: 1440, height: 900 }
const INVALID_MESSAGE = 'Photopea host returned an invalid message.'
const INVALID_HOST_URL = 'Photopea host URL must use HTTP or HTTPS.'

type PhotopeaWireMessage =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'bytes'; readonly value: readonly number[] }

interface LayerhandWindow extends Window {
  readonly __layerhandPhotopeaMessages: PhotopeaWireMessage[]
  readonly __layerhandSendToPhotopea: (message: PhotopeaWireMessage) => void
}

export interface PlaywrightPhotopeaTransportOptions {
  readonly hostUrl: string
  readonly viewport?: Viewport
}

export function decodePhotopeaWireMessage(value: unknown): PhotopeaMessage {
  if (!value || typeof value !== 'object') throw new Error(INVALID_MESSAGE)

  const message = value as { readonly type?: unknown; readonly value?: unknown }
  if (message.type === 'text' && typeof message.value === 'string') {
    return { type: 'text', value: message.value }
  }

  if (
    message.type === 'bytes' &&
    Array.isArray(message.value) &&
    message.value.every((byte): byte is number => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  ) {
    return { type: 'bytes', value: Uint8Array.from(message.value) }
  }

  throw new Error(INVALID_MESSAGE)
}

export class PlaywrightPhotopeaTransport implements PhotopeaTransport {
  readonly viewport: Viewport
  readonly #page: Page
  readonly #hostUrl: URL

  constructor(page: Page, options: PlaywrightPhotopeaTransportOptions) {
    let hostUrl: URL
    try {
      hostUrl = new URL(options.hostUrl)
    } catch {
      throw new Error(INVALID_HOST_URL)
    }

    if (hostUrl.protocol !== 'http:' && hostUrl.protocol !== 'https:') {
      throw new Error(INVALID_HOST_URL)
    }

    this.#page = page
    this.#hostUrl = hostUrl
    this.viewport = { ...(options.viewport ?? DEFAULT_VIEWPORT) }
  }

  async boot(configuration: PhotopeaConfiguration): Promise<void> {
    const hostUrl = new URL(this.#hostUrl)
    hostUrl.hash = encodeURIComponent(JSON.stringify(configuration))
    await this.#page.goto(hostUrl.toString())
  }

  async send(message: string | Uint8Array): Promise<void> {
    const wireMessage: PhotopeaWireMessage =
      typeof message === 'string' ? { type: 'text', value: message } : { type: 'bytes', value: Array.from(message) }

    await this.#page.evaluate((value) => {
      const layerhandWindow = window as unknown as LayerhandWindow
      layerhandWindow.__layerhandSendToPhotopea(value)
    }, wireMessage)
  }

  async nextMessage(timeoutMs: number): Promise<PhotopeaMessage> {
    await this.#page.waitForFunction(
      () => {
        const layerhandWindow = window as unknown as LayerhandWindow
        return layerhandWindow.__layerhandPhotopeaMessages.length > 0
      },
      undefined,
      { timeout: timeoutMs }
    )
    const wireMessage = await this.#page.evaluate(() => {
      const layerhandWindow = window as unknown as LayerhandWindow
      return layerhandWindow.__layerhandPhotopeaMessages.shift()
    })
    return decodePhotopeaWireMessage(wireMessage)
  }

  async press(key: string): Promise<void> {
    await this.#page.keyboard.press(key)
  }

  async reload(): Promise<void> {
    await this.#page.reload()
  }
}
