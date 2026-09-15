import { expect } from 'bun:test'
import { readPsd, writePsd, type Psd } from 'ag-psd'

export function rgba(width: number, height: number, values: readonly number[]) {
  return { width, height, data: Uint8ClampedArray.from(values) }
}

export function psdBytes(psd: Psd): Uint8Array {
  return new Uint8Array(writePsd(psd, { generateThumbnail: false }))
}

export function maskedSubjectPsd(): Uint8Array {
  const width = 64
  const height = 64
  const raster: number[] = []
  const mask: number[] = []
  const composite: number[] = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = x >= 16 && x < 48 && y >= 16 && y < 48 ? 0 : 255
      raster.push(255, 0, 0, 255)
      mask.push(alpha, alpha, alpha, 255)
      composite.push(255, 0, 0, alpha)
    }
  }

  const bytes = psdBytes({
    width,
    height,
    imageData: rgba(width, height, composite),
    children: [
      {
        name: 'Masked subject',
        imageData: rgba(width, height, raster),
        mask: { imageData: rgba(width, height, mask), disabled: false, defaultColor: 255 }
      }
    ]
  })
  const parsed = readPsd(bytes, { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true })
  expect(parsed.children?.[0]?.mask).toMatchObject({ disabled: false, top: 0, left: 0, bottom: 64, right: 64 })
  return bytes
}
