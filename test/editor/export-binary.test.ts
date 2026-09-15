import { describe, expect, test } from 'bun:test'
import { selectPngExport, selectPsdExport } from '../../src/editor/export-binary'
import type { PhotopeaMessage } from '../../src/editor/photopea-transport'
import { exportPng } from './support/export-png'

const marker: PhotopeaMessage = { type: 'text', value: 'begin:one' }
const bytes = (value: Uint8Array): PhotopeaMessage => ({ type: 'bytes', value })

for (const [format, select, valid] of [
  ['PSD', selectPsdExport, () => Uint8Array.of(56, 66, 80, 83)],
  ['PNG', selectPngExport, exportPng]
] as const) {
  describe(`${format} response selection`, () => {
    test.each([
      ['no marker', [bytes(valid())]],
      ['duplicate markers', [marker, marker, bytes(valid())]],
      ['no bytes after marker', [bytes(valid()), marker, { type: 'text', value: 'done' }]],
      ['two byte messages', [marker, bytes(valid()), bytes(valid())]]
    ] satisfies [string, PhotopeaMessage[]][])('rejects %s', (_name, messages) => {
      expect(() => select(messages, 'begin:one')).toThrow(
        expect.objectContaining({
          name: 'PhotopeaExportError',
          code: 'photopea_export_response'
        })
      )
    })

    test('ignores arbitrary text and bytes before the exact marker and copies the selected view', () => {
      const source = valid()
      const padded = new Uint8Array(source.length + 2)
      padded.set(source, 1)
      const view = padded.subarray(1, source.length + 1)
      const result = select(
        [
          { type: 'text', value: 'begin:one-extra' },
          bytes(Uint8Array.of(0)),
          marker,
          { type: 'text', value: 'diagnostic' },
          bytes(view),
          { type: 'text', value: 'done' }
        ],
        'begin:one'
      )
      view.fill(0)
      expect(result).toEqual(source)
    })
  })
}

test('rejects a wrong PSD signature', () => {
  expect(() => selectPsdExport([marker, bytes(Uint8Array.of(56, 66, 80, 66))], 'begin:one')).toThrow(
    expect.objectContaining({ code: 'photopea_invalid_psd' })
  )
})

test.each([
  ['signature only', (png: Uint8Array) => png.slice(0, 8)],
  [
    'wrong signature',
    (png: Uint8Array) => {
      png[0] = 0
      return png
    }
  ],
  [
    'non-IHDR first chunk',
    (png: Uint8Array) => {
      png[12] = 74
      return png
    }
  ],
  [
    'wrong IHDR length',
    (png: Uint8Array) => {
      png[11] = 12
      return png
    }
  ],
  [
    'zero width',
    (png: Uint8Array) => {
      png[19] = 0
      return png
    }
  ],
  [
    'zero height',
    (png: Uint8Array) => {
      png[23] = 0
      return png
    }
  ],
  [
    'out-of-bounds chunk length',
    (png: Uint8Array) => {
      png[33] = 255
      return png
    }
  ],
  ['missing CRC bytes', (png: Uint8Array) => png.slice(0, -1)],
  ['no IEND', (png: Uint8Array) => png.slice(0, -12)],
  [
    'nonzero IEND length',
    (png: Uint8Array) => {
      png[png.length - 9] = 1
      return png
    }
  ],
  ['trailing bytes', (png: Uint8Array) => Uint8Array.from([...png, 0])]
] as const)('rejects PNG with %s', (_name, corrupt) => {
  expect(() => selectPngExport([marker, bytes(corrupt(exportPng()))], 'begin:one')).toThrow(
    expect.objectContaining({ code: 'photopea_invalid_png' })
  )
})
