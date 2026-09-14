import { describe, expect, test } from 'bun:test'
import { ImageUploadError, MAX_IMAGE_BYTES, validateImageUpload } from '../../src/editor/image-upload'
import { jpeg, png } from './support/image-headers'

function expectUploadError(operation: () => unknown, code: ImageUploadError['code'], message: string): void {
  try {
    operation()
    throw new Error('Expected validateImageUpload to throw')
  } catch (error) {
    expect(error).toBeInstanceOf(ImageUploadError)
    expect((error as ImageUploadError).code).toBe(code)
    expect((error as Error).message).toBe(message)
  }
}

describe('validateImageUpload PNG', () => {
  test('reads the format and dimensions and copies the bytes', () => {
    const source = png(6000, 1)
    const result = validateImageUpload(source, 'wide.png')
    source[0] = 0

    expect(result).toMatchObject({
      filename: 'wide.png',
      format: 'png',
      width: 6000,
      height: 1
    })
    expect(result.bytes[0]).toBe(0x89)
  })

  test('accepts exactly 20 MiB', () => {
    expect(validateImageUpload(png(1, 1, MAX_IMAGE_BYTES), 'max.png').bytes).toHaveLength(MAX_IMAGE_BYTES)
  })

  test('rejects one byte over 20 MiB', () => {
    expectUploadError(
      () => validateImageUpload(png(1, 1, MAX_IMAGE_BYTES + 1), 'large.png'),
      'image_too_large',
      'Image exceeds the 20 MB limit.'
    )
  })

  test('rejects a 6001-pixel long edge', () => {
    expectUploadError(
      () => validateImageUpload(png(6001, 1), 'wide.png'),
      'image_dimensions_too_large',
      'Image dimensions exceed the 6000 px limit.'
    )
  })

  test('rejects zero dimensions', () => {
    expectUploadError(() => validateImageUpload(png(0, 1), 'broken.png'), 'malformed_image', 'Image data is malformed.')
  })

  test.each([
    [0, 1],
    [0, 2],
    [0, 4],
    [0, 8],
    [0, 16],
    [2, 8],
    [2, 16],
    [3, 1],
    [3, 2],
    [3, 4],
    [3, 8],
    [4, 8],
    [4, 16],
    [6, 8],
    [6, 16]
  ])('accepts PNG color type %i with bit depth %i', (colorType, bitDepth) => {
    for (const interlace of [0, 1]) {
      const bytes = png(1, 1)
      bytes.set([bitDepth, colorType, 0, 0, interlace], 24)
      new DataView(bytes.buffer).setUint32(29, Bun.hash.crc32(bytes.subarray(12, 29)))

      expect(validateImageUpload(bytes, 'image.png')).toMatchObject({ format: 'png', width: 1, height: 1 })
    }
  })

  test.each([
    ['invalid bit depth', [3, 6, 0, 0, 0]],
    ['reserved color type', [8, 1, 0, 0, 0]],
    ['reserved alpha color type', [8, 5, 0, 0, 0]],
    ['low-depth truecolor', [4, 2, 0, 0, 0]],
    ['16-bit palette', [16, 3, 0, 0, 0]],
    ['low-depth greyscale alpha', [4, 4, 0, 0, 0]],
    ['low-depth truecolor alpha', [4, 6, 0, 0, 0]],
    ['unknown compression', [8, 6, 1, 0, 0]],
    ['unknown filtering', [8, 6, 0, 1, 0]],
    ['unknown interlacing', [8, 6, 0, 0, 2]]
  ])('rejects PNG %s with a matching IHDR CRC', (_label, fields) => {
    const bytes = png(1, 1)
    bytes.set(fields, 24)
    new DataView(bytes.buffer).setUint32(29, Bun.hash.crc32(bytes.subarray(12, 29)))

    expectUploadError(() => validateImageUpload(bytes, 'bad.png'), 'malformed_image', 'Image data is malformed.')
  })

  test.each([24, 25, 26, 27, 28])('rejects truncated IHDR data at %i bytes', (length) => {
    expectUploadError(
      () => validateImageUpload(png(1, 1, 33).subarray(0, length), 'truncated.png'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test.each([29, 30, 31, 32])('rejects missing or truncated IHDR CRC at %i bytes', (length) => {
    expectUploadError(
      () => validateImageUpload(png(1, 1, 33).subarray(0, length), 'truncated.png'),
      'malformed_image',
      'Image data is malformed.'
    )
  })
})

describe('validateImageUpload JPEG', () => {
  test('walks marker segments and reads SOF dimensions', () => {
    expect(validateImageUpload(jpeg(6000, 1), 'wide.jpg')).toMatchObject({
      filename: 'wide.jpg',
      format: 'jpeg',
      width: 6000,
      height: 1
    })
  })

  test.each([
    [0xc0, 8],
    [0xc1, 12],
    [0xc2, 12],
    [0xc5, 12],
    [0xc6, 12],
    [0xc9, 12],
    [0xca, 12],
    [0xcd, 12],
    [0xce, 12],
    [0xc3, 2],
    [0xc3, 16],
    [0xc7, 2],
    [0xc7, 16],
    [0xcb, 2],
    [0xcb, 16],
    [0xcf, 2],
    [0xcf, 16]
  ])('accepts JPEG SOF %i with precision %i', (marker, precision) => {
    expect(validateImageUpload(jpeg(1, 1, { marker, precision }), 'image.jpg')).toMatchObject({
      format: 'jpeg',
      width: 1,
      height: 1
    })
  })

  test.each([
    [0xc0, 0],
    [0xc0, 12],
    [0xc1, 16],
    [0xc2, 16],
    [0xc5, 16],
    [0xc6, 16],
    [0xc9, 16],
    [0xca, 16],
    [0xcd, 16],
    [0xce, 16],
    [0xc3, 1],
    [0xc3, 17],
    [0xc7, 1],
    [0xc7, 17],
    [0xcb, 1],
    [0xcb, 17],
    [0xcf, 1],
    [0xcf, 17]
  ])('rejects JPEG SOF %i with precision %i', (marker, precision) => {
    expectUploadError(
      () => validateImageUpload(jpeg(1, 1, { marker, precision }), 'bad.jpg'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test.each([0x01, 0x10, 0x51, 0x15, 0xff])('rejects JPEG sampling byte %i', (sampling) => {
    expectUploadError(
      () => validateImageUpload(jpeg(1, 1, { components: [[1, sampling, 0]] }), 'bad.jpg'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test('accepts distinct component identifiers and sampling factors from one through four', () => {
    const components = [
      [0, 0x11, 0],
      [255, 0x24, 1],
      [7, 0x42, 2],
      [3, 0x33, 3]
    ]
    expect(validateImageUpload(jpeg(1, 1, { components }), 'image.jpg').format).toBe('jpeg')
  })

  test('rejects duplicate JPEG component identifiers', () => {
    expectUploadError(
      () =>
        validateImageUpload(
          jpeg(1, 1, {
            components: [
              [1, 0x11, 0],
              [1, 0x11, 0]
            ]
          }),
          'bad.jpg'
        ),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test.each([
    [0xc0, 4],
    [0xc3, 1]
  ])('rejects JPEG SOF %i with quantization table %i', (marker, table) => {
    expectUploadError(
      () => validateImageUpload(jpeg(1, 1, { marker, components: [[1, 0x11, table]] }), 'bad.jpg'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test.each([0xc2, 0xc6, 0xca, 0xce])('rejects five components in progressive JPEG SOF %i', (marker) => {
    const components = [
      [1, 0x11, 0],
      [2, 0x11, 0],
      [3, 0x11, 0],
      [4, 0x11, 0],
      [5, 0x11, 0]
    ]
    expectUploadError(
      () => validateImageUpload(jpeg(1, 1, { marker, components }), 'bad.jpg'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test('accepts five frame components in a sequential JPEG', () => {
    const components = [
      [1, 0x11, 0],
      [2, 0x11, 0],
      [3, 0x11, 0],
      [4, 0x11, 0],
      [5, 0x11, 0]
    ]
    expect(validateImageUpload(jpeg(1, 1, { components }), 'image.jpg').format).toBe('jpeg')
  })

  test('rejects a recognized JPEG without a complete SOF marker', () => {
    expectUploadError(
      () => validateImageUpload(Uint8Array.of(0xff, 0xd8, 0xff, 0xd9), 'bad.jpg'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test('rejects byte stuffing before a start-of-frame marker', () => {
    expectUploadError(
      () =>
        validateImageUpload(Uint8Array.of(0xff, 0xd8, 0xff, 0x00, 0x00, 0x02, ...jpeg(1, 1).slice(8)), 'stuffed.jpg'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test('rejects a repeated start-of-image marker before a start-of-frame marker', () => {
    expectUploadError(
      () => validateImageUpload(Uint8Array.of(0xff, 0xd8, 0xff, 0xd8, ...jpeg(1, 1).slice(8)), 'repeated.jpg'),
      'malformed_image',
      'Image data is malformed.'
    )
  })

  test('rejects unknown magic bytes', () => {
    expectUploadError(
      () => validateImageUpload(Uint8Array.of(0x47, 0x49, 0x46), 'image.gif'),
      'unsupported_image_format',
      'Only JPEG and PNG images are supported.'
    )
  })
})
