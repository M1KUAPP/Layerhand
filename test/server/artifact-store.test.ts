import { describe, expect, test } from 'bun:test'

import { MemoryArtifactStore, type ArtifactPutRequest } from '../../src/server/artifact-store'
import { S3ArtifactStore, type S3Bucket } from '../../src/server/s3-artifact-store'

const UPLOAD: ArtifactPutRequest = {
  kind: 'upload',
  bytes: Uint8Array.of(1, 2, 3),
  contentType: 'image/jpeg'
}

describe('MemoryArtifactStore', () => {
  test('stores exact bytes under a server-generated key', async () => {
    const store = new MemoryArtifactStore(() => 'random-object-id')

    const artifact = await store.put(UPLOAD)

    expect(artifact).toEqual({ key: 'upload/random-object-id.jpg' })
    expect(store.bytesForTesting(artifact.key)).toEqual(UPLOAD.bytes)
  })

  test('never accepts or incorporates a user filename', async () => {
    const request = {
      ...UPLOAD,
      filename: '../../../../private/customer.jpg'
    } as ArtifactPutRequest
    const store = new MemoryArtifactStore(() => 'random-object-id')

    const artifact = await store.put(request)

    expect(artifact.key).toBe('upload/random-object-id.jpg')
    expect(artifact.key).not.toContain('customer')
    expect(artifact.key).not.toContain('..')
  })

  test('presigns for one hour and deletes only the selected key', async () => {
    const ids = ['first-id', 'second-id']
    const store = new MemoryArtifactStore(() => ids.shift()!)
    const first = await store.put(UPLOAD)
    const second = await store.put({
      kind: 'result',
      bytes: Uint8Array.of(4, 5),
      contentType: 'image/vnd.adobe.photoshop'
    })

    const url = await store.presign(first.key)
    await store.delete(first.key)

    expect(url).toBe('https://artifacts.layerhand.invalid/upload/first-id.jpg?expires=3600')
    expect(store.bytesForTesting(first.key)).toBeUndefined()
    expect(store.bytesForTesting(second.key)).toEqual(Uint8Array.of(4, 5))
  })
})

describe('S3ArtifactStore', () => {
  test('passes private bytes and a one-hour GET signature to Bun S3', async () => {
    const calls: unknown[][] = []
    const bucket: S3Bucket = {
      async write(...args) {
        calls.push(['write', ...args])
        return 3
      },
      presign(...args) {
        calls.push(['presign', ...args])
        return 'https://storage.example/signed'
      },
      async delete(...args) {
        calls.push(['delete', ...args])
      }
    }
    const store = new S3ArtifactStore(bucket, () => 'random-object-id')

    const artifact = await store.put(UPLOAD)
    expect(await store.presign(artifact.key)).toBe('https://storage.example/signed')
    await store.delete(artifact.key)

    expect(calls).toEqual([
      ['write', 'upload/random-object-id.jpg', UPLOAD.bytes, { type: 'image/jpeg' }],
      [
        'presign',
        'upload/random-object-id.jpg',
        {
          expiresIn: 3600,
          method: 'GET',
          contentDisposition: 'attachment; filename="layerhand-upload.jpg"'
        }
      ],
      ['delete', 'upload/random-object-id.jpg']
    ])
  })
})
