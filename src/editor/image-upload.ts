export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_IMAGE_EDGE = 6000

export type ImageFormat = 'jpeg' | 'png'

export type ImageUploadErrorCode =
  'unsupported_image_format' | 'image_too_large' | 'malformed_image' | 'image_dimensions_too_large'

export class ImageUploadError extends Error {
  readonly code: ImageUploadErrorCode

  constructor(code: ImageUploadErrorCode, message: string) {
    super(message)
    this.name = 'ImageUploadError'
    this.code = code
  }
}

export interface ValidatedImageUpload {
  readonly bytes: Uint8Array
  readonly filename: string
  readonly format: ImageFormat
  // Expected displayed dimensions, including JPEG EXIF orientation.
  readonly width: number
  readonly height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
const PNG_IHDR_LENGTH = 13
const PNG_IHDR_TYPE = [0x49, 0x48, 0x44, 0x52] as const
const PNG_BIT_DEPTHS: Readonly<Record<number, readonly number[]>> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16]
}
const JPEG_SOI = [0xff, 0xd8] as const
const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0, 0] as const
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

const ERROR_MESSAGES: Record<ImageUploadErrorCode, string> = {
  unsupported_image_format: 'Only JPEG and PNG images are supported.',
  image_too_large: 'Image exceeds the 20 MB limit.',
  malformed_image: 'Image data is malformed.',
  image_dimensions_too_large: 'Image dimensions exceed the 6000 px limit.'
}

function uploadError(code: ImageUploadErrorCode): ImageUploadError {
  return new ImageUploadError(code, ERROR_MESSAGES[code])
}

function matchesBytes(bytes: Uint8Array, offset: number, expected: readonly number[]): boolean {
  return expected.every((value, index) => bytes[offset + index] === value)
}

function detectFormat(bytes: Uint8Array): ImageFormat {
  if (matchesBytes(bytes, 0, PNG_SIGNATURE)) {
    return 'png'
  }

  if (matchesBytes(bytes, 0, JPEG_SOI)) {
    return 'jpeg'
  }

  throw uploadError('unsupported_image_format')
}

function readPngDimensions(bytes: Uint8Array): { width: number; height: number } {
  // Require the signature, chunk length/type, all IHDR data, and its CRC field.
  if (
    bytes.byteLength < 33 ||
    !matchesBytes(bytes, 0, PNG_SIGNATURE) ||
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8) !== PNG_IHDR_LENGTH ||
    !matchesBytes(bytes, 12, PNG_IHDR_TYPE)
  ) {
    throw uploadError('malformed_image')
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)

  if (
    width === 0 ||
    height === 0 ||
    !PNG_BIT_DEPTHS[bytes[25]!]?.includes(bytes[24]!) ||
    bytes[26] !== 0 ||
    bytes[27] !== 0 ||
    (bytes[28] !== 0 && bytes[28] !== 1)
  ) {
    throw uploadError('malformed_image')
  }

  return { width, height }
}

function isStandaloneJpegMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)
}

function readExifOrientation(payload: Uint8Array): number | undefined {
  if (!matchesBytes(payload, 0, EXIF_SIGNATURE)) return undefined

  const tiff = new DataView(
    payload.buffer,
    payload.byteOffset + EXIF_SIGNATURE.length,
    payload.byteLength - EXIF_SIGNATURE.length
  )
  if (tiff.byteLength < 8) throw uploadError('malformed_image')

  const byteOrder = tiff.getUint16(0)
  const littleEndian = byteOrder === 0x4949
  if ((byteOrder !== 0x4949 && byteOrder !== 0x4d4d) || tiff.getUint16(2, littleEndian) !== 42) {
    throw uploadError('malformed_image')
  }

  const ifd = tiff.getUint32(4, littleEndian)
  if (ifd < 8 || ifd + 2 > tiff.byteLength) throw uploadError('malformed_image')
  const entries = tiff.getUint16(ifd, littleEndian)
  // Bound the complete IFD0 table and its next-IFD field to this APP1 segment.
  if (ifd + 2 + entries * 12 + 4 > tiff.byteLength) throw uploadError('malformed_image')

  let orientation: number | undefined
  for (let index = 0; index < entries; index += 1) {
    const entry = ifd + 2 + index * 12
    if (tiff.getUint16(entry, littleEndian) !== 0x0112) continue
    if (
      orientation !== undefined ||
      tiff.getUint16(entry + 2, littleEndian) !== 3 ||
      tiff.getUint32(entry + 4, littleEndian) !== 1
    ) {
      throw uploadError('malformed_image')
    }

    // A single SHORT is stored inline; do not follow unrelated EXIF offsets.
    orientation = tiff.getUint16(entry + 8, littleEndian)
    if (orientation < 1 || orientation > 8) throw uploadError('malformed_image')
  }

  return orientation
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let position = JPEG_SOI.length
  let dimensions: { width: number; height: number } | undefined
  let orientation: number | undefined

  while (position < bytes.byteLength) {
    if (bytes[position] !== 0xff) {
      throw uploadError('malformed_image')
    }

    while (bytes[position] === 0xff) {
      position += 1
    }

    if (position >= bytes.byteLength) {
      throw uploadError('malformed_image')
    }

    const marker = bytes[position]!
    position += 1

    // APP1 metadata can occur after SOF, but never inspect entropy-coded data.
    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x00 || marker === 0xd8) {
      throw uploadError('malformed_image')
    }

    if (isStandaloneJpegMarker(marker)) {
      continue
    }

    if (position + 2 > bytes.byteLength) {
      throw uploadError('malformed_image')
    }

    const length = view.getUint16(position)
    if (length < 2 || position + length > bytes.byteLength) {
      throw uploadError('malformed_image')
    }

    if (marker === 0xe1) {
      const value = readExifOrientation(bytes.subarray(position + 2, position + length))
      if (value !== undefined) {
        if (orientation !== undefined) throw uploadError('malformed_image')
        orientation = value
      }
    }

    if (JPEG_SOF_MARKERS.has(marker)) {
      if (dimensions !== undefined || length < 8) {
        throw uploadError('malformed_image')
      }

      const height = view.getUint16(position + 3)
      const width = view.getUint16(position + 5)
      const componentCount = bytes[position + 7]!
      const precision = bytes[position + 2]!
      const lossless = (marker & 3) === 3
      const progressive = (marker & 3) === 2
      const validPrecision = lossless
        ? precision >= 2 && precision <= 16
        : precision === 8 || (marker !== 0xc0 && precision === 12)

      if (
        componentCount === 0 ||
        (progressive && componentCount > 4) ||
        length !== 8 + componentCount * 3 ||
        width === 0 ||
        height === 0 ||
        !validPrecision
      ) {
        throw uploadError('malformed_image')
      }

      const componentIds = new Set<number>()
      for (let index = 0; index < componentCount; index += 1) {
        const offset = position + 8 + index * 3
        const id = bytes[offset]!
        const horizontalSampling = bytes[offset + 1]! >>> 4
        const verticalSampling = bytes[offset + 1]! & 0x0f
        const quantizationTable = bytes[offset + 2]!
        if (
          componentIds.has(id) ||
          horizontalSampling < 1 ||
          horizontalSampling > 4 ||
          verticalSampling < 1 ||
          verticalSampling > 4 ||
          quantizationTable > (lossless ? 0 : 3)
        ) {
          throw uploadError('malformed_image')
        }
        componentIds.add(id)
      }

      dimensions = { width, height }
    }

    position += length
  }

  if (!dimensions) throw uploadError('malformed_image')
  return orientation !== undefined && orientation >= 5
    ? { width: dimensions.height, height: dimensions.width }
    : dimensions
}

export function validateImageUpload(bytes: Uint8Array, filename: string): ValidatedImageUpload {
  const format = detectFormat(bytes)

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw uploadError('image_too_large')
  }

  const { width, height } = format === 'png' ? readPngDimensions(bytes) : readJpegDimensions(bytes)

  if (Math.max(width, height) > MAX_IMAGE_EDGE) {
    throw uploadError('image_dimensions_too_large')
  }

  return {
    bytes: Uint8Array.from(bytes),
    filename,
    format,
    width,
    height
  }
}
