import { describe, expect, test } from 'bun:test'
import { validateImageUpload } from '../../src/editor/image-upload'
import { jpeg } from './support/image-headers'

function exif(orientation: number, littleEndian = true): Uint8Array {
  const payload = new Uint8Array(32)
  payload.set([0x45, 0x78, 0x69, 0x66, 0, 0])
  const tiff = new DataView(payload.buffer, 6)
  tiff.setUint16(0, littleEndian ? 0x4949 : 0x4d4d)
  tiff.setUint16(2, 42, littleEndian)
  tiff.setUint32(4, 8, littleEndian)
  tiff.setUint16(8, 1, littleEndian)
  tiff.setUint16(10, 0x0112, littleEndian)
  tiff.setUint16(12, 3, littleEndian)
  tiff.setUint32(14, 1, littleEndian)
  tiff.setUint16(18, orientation, littleEndian)
  return payload
}

function withApp1(payload: Uint8Array, image = jpeg(32, 16), offset = 2): Uint8Array {
  const bytes = new Uint8Array(image.byteLength + payload.byteLength + 4)
  bytes.set(image.subarray(0, offset))
  bytes.set([0xff, 0xe1], offset)
  new DataView(bytes.buffer).setUint16(offset + 2, payload.byteLength + 2)
  bytes.set(payload, offset + 4)
  bytes.set(image.subarray(offset), offset + payload.byteLength + 4)
  return bytes
}

function expectMalformed(payload: Uint8Array): void {
  expect(() => validateImageUpload(withApp1(payload), 'bad.jpg')).toThrow(
    expect.objectContaining({
      name: 'ImageUploadError',
      code: 'malformed_image',
      message: 'Image data is malformed.'
    })
  )
}

describe('validateImageUpload JPEG EXIF orientation', () => {
  test.each([
    [1, 32, 16],
    [2, 32, 16],
    [3, 32, 16],
    [4, 32, 16],
    [5, 16, 32],
    [6, 16, 32],
    [7, 16, 32],
    [8, 16, 32]
  ])('returns displayed dimensions for orientation %i', (orientation, width, height) => {
    for (const littleEndian of [true, false]) {
      const bytes = withApp1(exif(orientation, littleEndian))
      const result = validateImageUpload(bytes, 'oriented.jpg')

      expect(result).toMatchObject({ format: 'jpeg', width, height })
      expect(result.bytes).toEqual(bytes)
      expect(result.bytes).not.toBe(bytes)
    }
  })

  test('reads EXIF from a byte-offset view', () => {
    const bytes = withApp1(exif(6, false))
    const storage = new Uint8Array(bytes.byteLength + 10)
    storage.set(bytes, 7)

    expect(validateImageUpload(storage.subarray(7, 7 + bytes.byteLength), 'view.jpg')).toMatchObject({
      width: 16,
      height: 32
    })
  })

  test('reads a non-immediate IFD0 with unrelated tags before orientation', () => {
    const payload = new Uint8Array(48)
    payload.set(exif(6).subarray(0, 14))
    const tiff = new DataView(payload.buffer, 6)
    tiff.setUint32(4, 12, true)
    tiff.setUint16(12, 2, true)
    tiff.setUint16(14, 0x0100, true)
    tiff.setUint16(16, 4, true)
    tiff.setUint32(18, 1, true)
    tiff.setUint32(22, 32, true)
    payload.set(exif(6).subarray(16, 28), 32)

    expect(validateImageUpload(withApp1(payload), 'offset.jpg')).toMatchObject({ width: 16, height: 32 })
  })

  test('retains SOF dimensions when EXIF or its orientation tag is absent', () => {
    const withoutOrientation = exif(6)
    new DataView(withoutOrientation.buffer).setUint16(16, 0x0100, true)
    const emptyIfd = exif(6).slice(0, 20)
    new DataView(emptyIfd.buffer).setUint16(14, 0, true)
    new DataView(emptyIfd.buffer).setUint32(16, 0, true)

    for (const bytes of [jpeg(32, 16), withApp1(withoutOrientation), withApp1(emptyIfd)]) {
      expect(validateImageUpload(bytes, 'normal.jpg')).toMatchObject({ width: 32, height: 16 })
    }
  })

  test('ignores non-EXIF APP1 segments without hiding a later EXIF segment', () => {
    const bytes = withApp1(new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0'), withApp1(exif(8)))

    expect(validateImageUpload(bytes, 'xmp.jpg')).toMatchObject({ width: 16, height: 32 })
  })

  test('reads APP1 after SOF but before the first scan', () => {
    const image = jpeg(32, 16)
    const bytes = withApp1(exif(6), image, image.byteLength - 2)

    expect(validateImageUpload(bytes, 'late-exif.jpg')).toMatchObject({ width: 16, height: 32 })
  })

  test('stops header inspection at the first scan without decoding pixels', () => {
    const header = jpeg(32, 16).subarray(0, -2)
    const bytes = Uint8Array.of(...header, 0xff, 0xda, 0, 8, 1, 1, 0, 0, 63, 0, 0, 0xff, 0xe1, 0)

    expect(validateImageUpload(bytes, 'header-only.jpg')).toMatchObject({ width: 32, height: 16 })
  })

  test('rejects an ambiguous second frame before the first scan', () => {
    const bytes = Uint8Array.of(...jpeg(32, 16).subarray(0, -2), ...jpeg(16, 32).subarray(8))

    expect(() => validateImageUpload(bytes, 'frames.jpg')).toThrow(expect.objectContaining({ code: 'malformed_image' }))
  })

  test('keeps the 6000-pixel long-edge limit after swapping axes', () => {
    expect(validateImageUpload(withApp1(exif(6), jpeg(6000, 1)), 'limit.jpg')).toMatchObject({
      width: 1,
      height: 6000
    })
    expect(() => validateImageUpload(withApp1(exif(6), jpeg(6001, 1)), 'large.jpg')).toThrow(
      expect.objectContaining({ code: 'image_dimensions_too_large' })
    )
  })

  test.each([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 27, 28, 29, 30, 31])(
    'rejects truncated EXIF metadata at %i bytes without an out-of-bounds read',
    (length) => {
      expectMalformed(exif(6).subarray(0, length))
    }
  )

  test.each([
    ['byte order', 6, [0x49, 0x4d]],
    ['TIFF magic', 8, [43, 0]],
    ['IFD offset inside TIFF header', 10, [4, 0, 0, 0]],
    ['IFD offset past APP1', 10, [26, 0, 0, 0]],
    ['overflowing IFD offset', 10, [255, 255, 255, 255]],
    ['IFD entry count past APP1', 14, [255, 255]],
    ['orientation type', 18, [4, 0]],
    ['zero orientation count', 20, [0, 0, 0, 0]],
    ['multiple orientation values', 20, [2, 0, 0, 0]],
    ['zero orientation', 24, [0, 0]],
    ['reserved orientation', 24, [9, 0]]
  ] as const)('rejects malformed EXIF %s', (_label, offset, values) => {
    const payload = exif(6)
    payload.set(values, offset)

    expectMalformed(payload)
  })

  test('rejects duplicate orientation tags rather than guessing which one the editor uses', () => {
    const payload = new Uint8Array(44)
    payload.set(exif(6).subarray(0, 28))
    payload.set(exif(1).subarray(16, 28), 28)
    new DataView(payload.buffer).setUint16(14, 2, true)

    expectMalformed(payload)
  })

  test('rejects duplicate EXIF orientation segments', () => {
    expect(() => validateImageUpload(withApp1(exif(6), withApp1(exif(1))), 'duplicate.jpg')).toThrow(
      expect.objectContaining({ code: 'malformed_image' })
    )
  })
})
