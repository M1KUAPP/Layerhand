import { crc32 } from 'node:zlib'

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2)
  new DataView(bytes.buffer).setUint16(0, value, true)
  return bytes
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, true)
  return bytes
}

/** Uncompressed ZIP. Claude Code's archive plugin source is a zip. */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  const encoder = new TextEncoder()

  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.data) >>> 0
    const size = u32(file.data.byteLength)
    const crcBytes = u32(crc)
    const nameLen = u16(name.byteLength)
    const local = concat([
      encoder.encode('PK\x03\x04'),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      crcBytes,
      size,
      size,
      nameLen,
      u16(0),
      name,
      file.data
    ])
    locals.push(local)
    centrals.push(
      concat([
        encoder.encode('PK\x01\x02'),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        crcBytes,
        size,
        size,
        nameLen,
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name
      ])
    )
    offset += local.byteLength
  }

  const central = concat(centrals)
  const end = concat([
    encoder.encode('PK\x05\x06'),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.byteLength),
    u32(offset),
    u16(0)
  ])
  return concat([...locals, central, end])
}
