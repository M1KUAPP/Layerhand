import sharp from 'sharp'
import { MAX_IMAGE_BYTES } from '../../../src/editor'

const WIDTH = 6000

function padJpegWithAppSegments(bytes: Uint8Array, targetBytes: number): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('Expected a JPEG SOI marker.')
  }

  let remaining = targetBytes - bytes.byteLength
  if (remaining < 0 || (remaining > 0 && remaining < 4)) {
    throw new Error('The JPEG cannot be padded to the requested byte length.')
  }

  const segmentBytes: number[] = []
  while (remaining > 0) {
    let size = Math.min(remaining, 65_537)
    const leftover = remaining - size
    if (leftover > 0 && leftover < 4) size -= 4 - leftover
    if (size < 4) throw new Error('An APP15 segment must be at least four bytes.')
    segmentBytes.push(size)
    remaining -= size
  }

  const output = new Uint8Array(targetBytes)
  output.set(bytes.subarray(0, 2), 0)
  let offset = 2

  for (const size of segmentBytes) {
    const payloadBytes = size - 4
    output[offset] = 0xff
    output[offset + 1] = 0xef
    new DataView(output.buffer).setUint16(offset + 2, payloadBytes + 2)
    offset += size
  }

  output.set(bytes.subarray(2), offset)
  if (output.byteLength !== MAX_IMAGE_BYTES) {
    throw new Error('The padded JPEG must be exactly 20 MiB.')
  }
  return output
}

export async function createLiveBoundaryImages(): Promise<{
  png: Uint8Array
  jpeg: Uint8Array
  maxJpeg: Uint8Array
}> {
  const pixels = Buffer.alloc(WIDTH * 3, 0x7f)
  const input = { raw: { width: WIDTH, height: 1, channels: 3 as const } }
  const png = await sharp(pixels, input).png().toBuffer()
  const jpeg = await sharp(pixels, input).jpeg({ quality: 90 }).toBuffer()

  return {
    png: Uint8Array.from(png),
    jpeg: Uint8Array.from(jpeg),
    maxJpeg: padJpegWithAppSegments(jpeg, MAX_IMAGE_BYTES)
  }
}
