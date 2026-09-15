import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join, posix } from 'node:path'

export interface InputFixtureEvidence {
  readonly path: string
  readonly sha256: string
}

export function recordOutputPath(filename: string): string {
  return posix.join('output', filename)
}

export async function persistInputFixture(outputDirectory: string, jpeg: Uint8Array): Promise<InputFixtureEvidence> {
  const path = join(outputDirectory, 'input.jpg')
  await writeFile(path, jpeg)

  return {
    path,
    sha256: createHash('sha256').update(jpeg).digest('hex')
  }
}
