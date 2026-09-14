import { validateImageUpload, type ImageFormat, type ValidatedImageUpload } from './image-upload'
import type { PhotopeaMessage } from './photopea-transport'

export interface PhotopeaDocumentBridge {
  boot(): Promise<void>
  openFile(bytes: Uint8Array): Promise<void>
  runScript(script: string): Promise<readonly PhotopeaMessage[]>
  press(key: string): Promise<void>
}

export interface LoadedPhotopeaDocument {
  readonly filename: string
  readonly format: ImageFormat
  readonly width: number
  readonly height: number
  readonly loadMs: number
}

export class PhotopeaDocumentError extends Error {
  readonly code = 'photopea_document_mismatch' as const

  constructor(message = 'Photopea opened a document that does not match the uploaded image.') {
    super(message)
    this.name = 'PhotopeaDocumentError'
  }
}

function verifyDocument(messages: readonly PhotopeaMessage[], upload: ValidatedImageUpload): void {
  const metadata = messages.filter(
    (message) => message.type === 'text' && message.value.startsWith('layerhand:document:')
  )
  if (metadata.length !== 1 || metadata[0]?.type !== 'text') throw new PhotopeaDocumentError()

  const fields = metadata[0].value.split(':')
  if (fields.length !== 5) throw new PhotopeaDocumentError()
  const width = Number(fields[2])
  const height = Number(fields[3])
  if (
    !Number.isSafeInteger(width) ||
    width <= 0 ||
    String(width) !== fields[2] ||
    !Number.isSafeInteger(height) ||
    height <= 0 ||
    String(height) !== fields[3] ||
    width !== upload.width ||
    height !== upload.height
  )
    throw new PhotopeaDocumentError()

  let filename: string
  try {
    filename = decodeURIComponent(fields[4]!)
  } catch {
    throw new PhotopeaDocumentError()
  }
  if (filename !== upload.filename) throw new PhotopeaDocumentError()
}

export class PhotopeaDocumentLoader {
  readonly #bridge: PhotopeaDocumentBridge
  readonly #now: () => number

  constructor(bridge: PhotopeaDocumentBridge, options: { readonly now?: () => number } = {}) {
    this.#bridge = bridge
    this.#now = options.now ?? (() => performance.now())
  }

  async open(bytes: Uint8Array, filename: string): Promise<LoadedPhotopeaDocument> {
    const upload = validateImageUpload(bytes, filename)
    await this.#bridge.boot()
    const startedAt = this.#now()
    await this.#bridge.openFile(upload.bytes)
    const escapedFilename = JSON.stringify(upload.filename)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
    const messages = await this.#bridge.runScript(
      `var d = app.activeDocument;\nd.name = ${escapedFilename};\napp.UI.fitTheArea();\n` +
        'app.echoToOE("layerhand:document:" + Math.round(d.width) + ":" + Math.round(d.height) + ":" + encodeURIComponent(d.name));'
    )
    verifyDocument(messages, upload)
    await this.#bridge.press('v')
    return {
      filename: upload.filename,
      format: upload.format,
      width: upload.width,
      height: upload.height,
      loadMs: this.#now() - startedAt
    }
  }
}
