export type ArtifactKind = 'upload' | 'preview' | 'result'

export interface ArtifactPutRequest {
  kind: ArtifactKind
  bytes: Uint8Array
  contentType: 'image/jpeg' | 'image/png' | 'image/vnd.adobe.photoshop'
}

export interface StoredArtifact {
  key: string
}

export interface ArtifactStore {
  put(request: ArtifactPutRequest): Promise<StoredArtifact>
  presign(key: string): Promise<string>
  delete(key: string): Promise<void>
}

const EXTENSIONS: Readonly<Record<ArtifactPutRequest['contentType'], string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/vnd.adobe.photoshop': 'psd'
}

export function createArtifactKey(
  request: Pick<ArtifactPutRequest, 'kind' | 'contentType'>,
  createId: () => string
): string {
  const id = createId()
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Artifact identifier is invalid')
  return `${request.kind}/${id}.${EXTENSIONS[request.contentType]}`
}

export class MemoryArtifactStore implements ArtifactStore {
  readonly #objects = new Map<string, Uint8Array>()
  readonly #createId: () => string

  constructor(createId: () => string = () => crypto.randomUUID()) {
    this.#createId = createId
  }

  async put(request: ArtifactPutRequest): Promise<StoredArtifact> {
    const key = createArtifactKey(request, this.#createId)
    this.#objects.set(key, Uint8Array.from(request.bytes))
    return { key }
  }

  async presign(key: string): Promise<string> {
    if (!this.#objects.has(key)) throw new Error('Artifact does not exist')
    return `https://artifacts.layerhand.invalid/${encodeURI(key)}?expires=3600`
  }

  async delete(key: string): Promise<void> {
    this.#objects.delete(key)
  }

  bytesForTesting(key: string): Uint8Array | undefined {
    const bytes = this.#objects.get(key)
    return bytes && Uint8Array.from(bytes)
  }
}
