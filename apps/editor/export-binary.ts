import { PhotopeaExportError } from './photopea-export-error'
import type { PhotopeaMessage } from './photopea-transport'

function selectBytes(messages: readonly PhotopeaMessage[], beginMarker: string): Uint8Array {
  const markers = messages.flatMap((message, index) =>
    message.type === 'text' && message.value === beginMarker ? [index] : []
  )
  const selected = messages.slice((markers[0] ?? -1) + 1).filter((message) => message.type === 'bytes')
  if (markers.length !== 1 || selected.length !== 1) {
    throw new PhotopeaExportError('photopea_export_response', 'Photopea returned an ambiguous export response.')
  }
  return Uint8Array.from(selected[0]!.value)
}

export function selectPsdExport(messages: readonly PhotopeaMessage[], beginMarker: string): Uint8Array {
  const bytes = selectBytes(messages, beginMarker)
  if (![56, 66, 80, 83].every((value, index) => bytes[index] === value)) {
    throw new PhotopeaExportError('photopea_invalid_psd', 'Photopea returned invalid PSD bytes.')
  }
  return bytes
}

function validPng(bytes: Uint8Array): boolean {
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return false
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset)
    const end = offset + 12 + length
    if (end > bytes.length) return false
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    if (
      offset === 8 &&
      (type !== 'IHDR' || length !== 13 || !view.getUint32(offset + 8) || !view.getUint32(offset + 12))
    ) {
      return false
    }
    if (type === 'IEND') return length === 0 && end === bytes.length
    offset = end
  }
  return false
}

export function selectPngExport(messages: readonly PhotopeaMessage[], beginMarker: string): Uint8Array {
  const bytes = selectBytes(messages, beginMarker)
  if (!validPng(bytes)) {
    throw new PhotopeaExportError('photopea_invalid_png', 'Photopea returned invalid PNG bytes.')
  }
  return bytes
}
