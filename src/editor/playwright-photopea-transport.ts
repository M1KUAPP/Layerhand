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
  readonly __layerhandSendToPhotopea: (
    message: { readonly type: 'text'; readonly value: string } | { readonly type: 'bytes'; readonly value: Uint8Array }
  ) => void
}

function isByteArray(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false

  for (let index = 0; index < value.length; index += 1) {
    const byte = value[index]
    if (typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255) return false
  }

  return true
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

  if (message.type === 'bytes' && isByteArray(message.value)) {
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
    // Base64 avoids Playwright serializing one protocol object per byte.
    const wireMessage =
      typeof message === 'string'
        ? { type: 'text' as const, value: message }
        : { type: 'bytes' as const, value: Buffer.from(message).toString('base64') }

    await this.#page.evaluate((value) => {
      const layerhandWindow = window as unknown as LayerhandWindow
      if (value.type === 'text') {
        layerhandWindow.__layerhandSendToPhotopea(value)
        return
      }

      const decoded = atob(value.value)
      const bytes = new Uint8Array(decoded.length)
      for (let index = 0; index < decoded.length; index += 1) {
        bytes[index] = decoded.charCodeAt(index)
      }
      layerhandWindow.__layerhandSendToPhotopea({ type: 'bytes', value: bytes })
    }, wireMessage)
  }

  async nextMessage(timeoutMs: number): Promise<PhotopeaMessage> {
    const ready = await this.#page.waitForFunction(
      () => {
        const layerhandWindow = window as unknown as LayerhandWindow
        return layerhandWindow.__layerhandPhotopeaMessages.length > 0
      },
      undefined,
      { timeout: timeoutMs }
    )
    await ready.dispose()
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
