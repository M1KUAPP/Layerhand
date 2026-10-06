import { S3Client } from 'bun'

import { createArtifactKey, type ArtifactPutRequest, type ArtifactStore, type StoredArtifact } from './artifact-store'

export interface S3Bucket {
  write(key: string, bytes: Uint8Array, options: { type: string }): Promise<number | unknown>
  presign(key: string, options: { expiresIn: number; method: 'GET'; contentDisposition?: string }): string
  delete(key: string): Promise<void>
}

export interface S3ArtifactStoreConfig {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export function createS3Bucket(config: S3ArtifactStoreConfig): S3Bucket {
  return new S3Client(config)
}

// Keys are `kind/id.ext`; the friendly name keeps the kind and extension.
function downloadName(key: string): string {
  const slash = key.indexOf('/')
  const dot = key.lastIndexOf('.')
  if (slash < 1 || dot <= slash) return 'layerhand-download'
  return `layerhand-${key.slice(0, slash)}.${key.slice(dot + 1)}`
}

export class S3ArtifactStore implements ArtifactStore {
  readonly #bucket: S3Bucket
  readonly #createId: () => string

  constructor(bucket: S3Bucket, createId: () => string = () => crypto.randomUUID()) {
    this.#bucket = bucket
    this.#createId = createId
  }

  async put(request: ArtifactPutRequest): Promise<StoredArtifact> {
    const key = createArtifactKey(request, this.#createId)
    await this.#bucket.write(key, request.bytes, { type: request.contentType })
    return { key }
  }

  async presign(key: string): Promise<string> {
    // The download attribute is ignored on a cross-origin link, so the
    // filename travels in the signed response headers instead (#135).
    return this.#bucket.presign(key, {
      expiresIn: 3600,
      method: 'GET',
      contentDisposition: `attachment; filename="${downloadName(key)}"`
    })
  }

  async delete(key: string): Promise<void> {
    await this.#bucket.delete(key)
  }
}
