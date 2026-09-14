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
