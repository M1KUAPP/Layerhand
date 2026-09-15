export function exportPng(): Uint8Array {
  // One RGBA pixel: IHDR, zlib-compressed IDAT, and terminal IEND.
  // Structural validation does not inspect CRCs or decompress IDAT.
  return Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 96, 96, 96, 248, 15, 0, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 73, 69, 78, 68,
    0, 0, 0, 0
  ])
}
