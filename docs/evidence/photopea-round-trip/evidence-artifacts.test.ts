import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { persistInputFixture } from './evidence-artifacts.ts'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })))
})

describe('persistInputFixture', () => {
  test('retains the exact JPEG bytes with a stable SHA-256 digest', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'layerhand-evidence.'))
    temporaryDirectories.push(outputDirectory)
    const jpeg = Uint8Array.of(0xff, 0xd8, 0xff, 0xd9)

    const evidence = await persistInputFixture(outputDirectory, jpeg)

    expect(new Uint8Array(await readFile(evidence.path))).toEqual(jpeg)
    expect(evidence.sha256).toBe('32461d5bd1773012acef0ba15636752949bd7c2ce50f9172159d9f56cf0dd9af')
  })
})

test('records evidence paths without a machine-specific directory', async () => {
  const artifacts = await import('./evidence-artifacts.ts')
  const recordOutputPath = Reflect.get(artifacts, 'recordOutputPath')

  expect(recordOutputPath).toBeFunction()
  expect(recordOutputPath('input.jpg')).toBe('output/input.jpg')
})

test('retains a direct JPEG-post-to-PSD round-trip timing', async () => {
  const result = JSON.parse(await readFile(join(import.meta.dir, 'results', 'result.json'), 'utf8')) as Record<
    string,
    unknown
  >

  expect(result.roundTripMs).toBeNumber()
  expect(result.roundTripMs).toBeGreaterThanOrEqual(result.uploadMs)
  expect(result.roundTripMs).toBeLessThanOrEqual(result.totalMs)
})
