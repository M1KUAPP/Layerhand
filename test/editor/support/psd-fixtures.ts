import { writePsd, type Psd } from 'ag-psd'

export function rgba(width: number, height: number, values: readonly number[]) {
  return { width, height, data: Uint8ClampedArray.from(values) }
}

export function psdBytes(psd: Psd): Uint8Array {
  return new Uint8Array(writePsd(psd, { generateThumbnail: false }))
}
