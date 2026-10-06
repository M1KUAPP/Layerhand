export function png(width: number, height: number, size = 33): Uint8Array {
  const bytes = new Uint8Array(Math.max(size, 33))
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  new DataView(bytes.buffer).setUint32(8, 13)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  bytes.set([8, 6, 0, 0, 0], 24)
  new DataView(bytes.buffer).setUint32(29, Bun.hash.crc32(bytes.subarray(12, 29)))
  return bytes
}

export function jpeg(
  width: number,
  height: number,
  options: { marker?: number; precision?: number; components?: readonly (readonly number[])[] } = {}
): Uint8Array {
  const components = options.components ?? [[1, 0x11, 0]]
  const frameLength = 8 + components.length * 3
  return Uint8Array.of(
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    options.marker ?? 0xc0,
    (frameLength >>> 8) & 0xff,
    frameLength & 0xff,
    options.precision ?? 8,
    (height >>> 8) & 0xff,
    height & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    components.length,
    ...components.flat(),
    0xff,
    0xd9
  )
}
