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
  readonly width: number
  readonly height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
const PNG_IHDR_LENGTH = 13
const PNG_IHDR_TYPE = [0x49, 0x48, 0x44, 0x52] as const
const JPEG_SOI = [0xff, 0xd8] as const
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

  if (width === 0 || height === 0) {
    throw uploadError('malformed_image')
  }

  return { width, height }
}

function isStandaloneJpegMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let position = JPEG_SOI.length

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

    if (marker === 0x00 || marker === 0xd8 || marker === 0xd9 || marker === 0xda) {
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

    if (JPEG_SOF_MARKERS.has(marker)) {
      if (length < 8) {
        throw uploadError('malformed_image')
      }

      const height = view.getUint16(position + 3)
      const width = view.getUint16(position + 5)
      const componentCount = bytes[position + 7]!

      if (componentCount === 0 || length !== 8 + componentCount * 3 || width === 0 || height === 0) {
        throw uploadError('malformed_image')
      }

      return { width, height }
    }

    position += length
  }

  throw uploadError('malformed_image')
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
