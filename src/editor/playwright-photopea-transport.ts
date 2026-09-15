import type { Page } from 'playwright-core'
import type { Viewport } from './session'
import type { PhotopeaConfiguration, PhotopeaMessage, PhotopeaTransport } from './photopea-transport'

const DEFAULT_VIEWPORT: Viewport = { width: 1440, height: 900 }
const INVALID_MESSAGE = 'Photopea host returned an invalid message.'
const INVALID_HOST_URL = 'Photopea host URL must use HTTP or HTTPS.'

// A message as the host page holds it, on either side of Photopea.
type PhotopeaPageMessage =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'bytes'; readonly value: Uint8Array }

// Files cross the page boundary as base64 in both directions, because Playwright
// serializes an array of bytes as one protocol object per byte.
type PhotopeaWireMessage =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'bytes'; readonly value: string }

interface LayerhandWindow extends Window {
  readonly __layerhandPhotopeaMessages: PhotopeaPageMessage[]
  readonly __layerhandSendToPhotopea: (message: PhotopeaPageMessage) => void
}

export interface PlaywrightPhotopeaTransportOptions {
  readonly hostUrl: string
  /** Applied before host navigation. Defaults to 1440x900. */
  readonly viewport?: Viewport
}

export function decodePhotopeaWireMessage(value: unknown): PhotopeaMessage {
  if (!value || typeof value !== 'object') throw new Error(INVALID_MESSAGE)

  const message = value as { readonly type?: unknown; readonly value?: unknown }
  if (message.type === 'text' && typeof message.value === 'string') {
    return { type: 'text', value: message.value }
  }

  if (message.type === 'bytes' && typeof message.value === 'string') {
    const bytes = Buffer.from(message.value, 'base64')
    // Buffer skips what is not base64, so only a value that encodes back to itself arrived whole.
    if (bytes.toString('base64') === message.value) return { type: 'bytes', value: new Uint8Array(bytes) }
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
    await this.#page.setViewportSize(this.viewport)
    const response = await this.#page.goto(hostUrl.toString())
    // Hash-only navigation preserves the old host and its message queue.
    if (response === null) await this.#page.reload()
  }

  async send(message: string | Uint8Array): Promise<void> {
    const wireMessage: PhotopeaWireMessage =
      typeof message === 'string'
        ? { type: 'text', value: message }
        : { type: 'bytes', value: Buffer.from(message).toString('base64') }

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
    const wireMessage = await this.#page.evaluate((): PhotopeaWireMessage | undefined => {
      const layerhandWindow = window as unknown as LayerhandWindow
      const message = layerhandWindow.__layerhandPhotopeaMessages.shift()
      if (message?.type !== 'bytes') return message

      // In chunks, because String.fromCharCode takes each byte as its own argument.
      let binary = ''
      for (let offset = 0; offset < message.value.length; offset += 0x8000) {
        const chunk = message.value.subarray(offset, offset + 0x8000)
        binary += String.fromCharCode.apply(null, chunk as unknown as number[])
      }
      return { type: 'bytes', value: btoa(binary) }
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
