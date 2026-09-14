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

function scriptString(value: string): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function readDocumentCount(messages: readonly PhotopeaMessage[]): number {
  const snapshots = messages.filter(
    (message) => message.type === 'text' && message.value.startsWith('layerhand:documents:')
  )
  if (snapshots.length !== 1 || snapshots[0]?.type !== 'text') throw new PhotopeaDocumentError()
  const raw = snapshots[0].value.slice('layerhand:documents:'.length)
  const count = Number(raw)
  if (!Number.isSafeInteger(count + 1) || count < 0 || String(count) !== raw) throw new PhotopeaDocumentError()
  return count
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
    const documentCount = readDocumentCount(
      await this.#bridge.runScript('app.echoToOE("layerhand:documents:" + app.documents.length);')
    )
    const startedAt = this.#now()
    await this.#bridge.openFile(upload.bytes)
    const escapedFilename = scriptString(upload.filename)
    const escapedDisplayName = scriptString(upload.filename.replace(/\.(?:png|jpe?g)$/i, ''))
    // Photopea truncates display names at the first period; source preserves identity.
    const messages = await this.#bridge.runScript(
      `if (app.documents.length === ${documentCount + 1}) {\n` +
        `var d = app.documents[${documentCount}];\napp.activeDocument = d;\n` +
        `d.name = ${escapedDisplayName};\nd.source = ${escapedFilename};\napp.UI.fitTheArea();\n` +
        'app.echoToOE("layerhand:document:" + Math.round(d.width) + ":" + Math.round(d.height) + ":" + encodeURIComponent(d.source));\n}'
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
