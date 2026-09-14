import { describe, expect, test } from 'bun:test'

import { validateImageUpload } from '../../src/editor/image-upload'

const SAMPLE_PATH = new URL('../../src/web/assets/sample-photo.png', import.meta.url)

describe('bundled sample photo', () => {
  test('is a valid, lightweight source image for the demo', async () => {
    const file = Bun.file(SAMPLE_PATH)
    const bytes = new Uint8Array(await file.arrayBuffer())

    expect(file.size).toBeLessThanOrEqual(2_000_000)
    expect(validateImageUpload(bytes, 'sample-photo.png')).toMatchObject({
      format: 'png',
      width: 1536,
      height: 1024
    })
  })
})
