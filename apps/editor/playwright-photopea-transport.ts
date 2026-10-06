import type { Page } from 'playwright-core'
import type { Viewport } from './session'
import type { PhotopeaConfiguration, PhotopeaMessage, PhotopeaTransport } from './photopea-transport'

const DEFAULT_VIEWPORT: Viewport = { width: 1440, height: 900 }
const INVALID_MESSAGE = 'Photopea host returned an invalid message.'
const INVALID_HOST_URL = 'Photopea host URL must use HTTP or HTTPS.'

/**
 * The most of an exported file one reply carries out of the page. A CDP
 * connection closes on any message over 256 MiB, which a file of about
 * 192 MiB fills once encoded, so a file leaves in slices instead (#100).
 */
export const FILE_SLICE_BYTES = 4 * 2 ** 20

// A message as the host page holds it, on either side of Photopea.
type PhotopeaPageMessage =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'bytes'; readonly value: Uint8Array }

// Files cross the page boundary as base64 in both directions, because Playwright
// serializes an array of bytes as one protocol object per byte.
type PhotopeaWireMessage =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'bytes'; readonly value: string }

// What taking a message from the host queue returns: text whole, or a file's size.
type PhotopeaQueueHead =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'file'; readonly byteLength: number }

interface LayerhandWindow extends Window {
  readonly __layerhandPhotopeaMessages: PhotopeaPageMessage[]
  readonly __layerhandSendToPhotopea: (message: PhotopeaPageMessage) => void
  // The file being read out of the page, from its first slice to its last.
  __layerhandPhotopeaFile?: Uint8Array
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

  throw new Error(INVALID_MESSAGE)
}

// Decodes one slice's base64 straight into the file, so reading makes no copies
// of its own. Buffer skips what is not base64, so a slice arrived whole only if
// it is the exact length of its bytes' base64 and decodes to every one of them.
function writeSlice(file: Buffer, start: number, end: number, slice: unknown): void {
  const byteLength = end - start
  if (
    typeof slice !== 'string' ||
    slice.length !== Math.ceil(byteLength / 3) * 4 ||
    Buffer.byteLength(slice, 'base64') !== byteLength ||
    file.write(slice, start, byteLength, 'base64') !== byteLength
  ) {
    throw new Error(INVALID_MESSAGE)
  }
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
    const head = await this.#page.evaluate((): PhotopeaQueueHead | undefined => {
      const layerhandWindow = window as unknown as LayerhandWindow
      const message = layerhandWindow.__layerhandPhotopeaMessages.shift()
      if (message?.type !== 'bytes') return message

      layerhandWindow.__layerhandPhotopeaFile = message.value
      return { type: 'file', byteLength: message.value.byteLength }
    })
    if (head?.type !== 'file') return decodePhotopeaWireMessage(head)
    if (!Number.isSafeInteger(head.byteLength) || head.byteLength < 0) throw new Error(INVALID_MESSAGE)
    return { type: 'bytes', value: await this.#readFile(head.byteLength) }
  }

  // Assembles the file taken from the queue, one slice to a reply.
  async #readFile(byteLength: number): Promise<Uint8Array> {
    const bytes = new Uint8Array(byteLength)
    const file = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    try {
      for (let start = 0; start < byteLength; start += FILE_SLICE_BYTES) {
        const end = Math.min(start + FILE_SLICE_BYTES, byteLength)
        const slice = await this.#page.evaluate(
          ([start, end]) => {
            const file = (window as unknown as LayerhandWindow).__layerhandPhotopeaFile
            if (!file) return undefined

            // In chunks, because String.fromCharCode takes each byte as its own argument.
            let binary = ''
            for (let offset = start; offset < end; offset += 0x8000) {
              const chunk = file.subarray(offset, Math.min(offset + 0x8000, end))
              binary += String.fromCharCode.apply(null, chunk as unknown as number[])
            }
            return btoa(binary)
          },
          [start, end] as const
        )
        writeSlice(file, start, end, slice)
      }
    } finally {
      // A failed slice must not leave the file parked in the page: an unrelated later
      // command could be misread as a continuation of it. If the page itself is gone,
      // this cleanup call has nothing to release and its own failure is not our error.
      await this.#page
        .evaluate(() => {
          delete (window as unknown as LayerhandWindow).__layerhandPhotopeaFile
        })
        .catch(() => {})
    }
    return bytes
  }

  async press(key: string): Promise<void> {
    await this.#page.keyboard.press(key)
  }

  async reload(): Promise<void> {
    await this.#page.reload()
  }
}
