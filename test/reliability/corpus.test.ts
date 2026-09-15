import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { validateImageUpload as baseValidateImageUpload } from '../../src/editor/image-upload'
import {
  loadReliabilityCorpus,
  ReliabilityCorpusError,
  type ReliabilityCorpusErrorCode
} from '../../src/reliability/corpus'
import { jpeg } from '../editor/support/image-headers'

const validateImageUpload = (bytes: Uint8Array, filename = 'image.jpg') => baseValidateImageUpload(bytes, filename)

const manifest = new URL('../images/manifest.json', import.meta.url)

describe('reliability corpus', () => {
  test('contains five valid product and five valid interior photographs', async () => {
    const cases = await loadReliabilityCorpus(manifest)

    expect(cases).toHaveLength(10)
    expect(cases.filter((item) => item.category === 'product')).toHaveLength(5)
    expect(cases.filter((item) => item.category === 'interior')).toHaveLength(5)
    expect(new Set(cases.map((item) => item.id)).size).toBe(10)

    for (const item of cases) {
      const bytes = await Bun.file(item.imageUrl).bytes()
      expect(validateImageUpload(bytes)).toMatchObject({ format: 'jpeg' })
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.sha256)
      expect(item.instruction.trim().length).toBeGreaterThan(20)
      expect(item.expectation.trim().length).toBeGreaterThan(20)
      expect(item.source.licenseUrl).toBe('https://creativecommons.org/licenses/by/2.0/')
    }
  })

  describe('corpus validation negative tests', () => {
    let tempDir: string
    let dummyImageBytes: Uint8Array
    let dummySha256: string

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'corpus-test-'))
      dummyImageBytes = jpeg(1, 1)
      dummySha256 = createHash('sha256').update(dummyImageBytes).digest('hex')
      await writeFile(join(tempDir, 'valid.jpg'), dummyImageBytes)
      await writeFile(join(tempDir, 'corrupt.jpg'), Uint8Array.of(0x00, 0x11, 0x22))
    })

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    function createValidCase(index: number, category: 'product' | 'interior') {
      return {
        id: `case-${index}`,
        category,
        image: 'valid.jpg',
        sha256: dummySha256,
        instruction: 'This is a sufficiently long valid instruction for editing.',
        expectation: 'This is a sufficiently long human expectation description.',
        source: {
          openImagesId: `open-id-${index}`,
          author: `Author ${index}`,
          landingUrl: `https://example.com/landing/${index}`,
          downloadUrl: `https://example.com/download/${index}.jpg`,
          licenseUrl: 'https://creativecommons.org/licenses/by/2.0/'
        }
      }
    }

    function createTenCases() {
      return [
        createValidCase(1, 'product'),
        createValidCase(2, 'product'),
        createValidCase(3, 'product'),
        createValidCase(4, 'product'),
        createValidCase(5, 'product'),
        createValidCase(6, 'interior'),
        createValidCase(7, 'interior'),
        createValidCase(8, 'interior'),
        createValidCase(9, 'interior'),
        createValidCase(10, 'interior')
      ]
    }

    async function writeManifest(content: unknown): Promise<URL> {
      const manifestPath = join(tempDir, `manifest-${Math.random().toString(36).slice(2)}.json`)
      const serialized = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      await writeFile(manifestPath, serialized, 'utf-8')
      return pathToFileURL(manifestPath)
    }

    async function assertCorpusError(manifestUrl: URL, expectedCode: ReliabilityCorpusErrorCode) {
      try {
        await loadReliabilityCorpus(manifestUrl)
        expect().fail(`Expected loadReliabilityCorpus to throw ${expectedCode}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ReliabilityCorpusError)
        expect((error as ReliabilityCorpusError).code).toBe(expectedCode)
      }
    }

    test('rejects duplicate case ids', async () => {
      const cases = createTenCases()
      cases[1]!.id = cases[0]!.id
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'duplicate_case_id')
    })

    test('rejects a category split other than five/five', async () => {
      const cases = createTenCases()
      cases[0]!.category = 'interior' // Now 4 product, 6 interior
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'invalid_category_split')
    })

    test('rejects an unsupported manifest URL scheme', async () => {
      const httpUrl = new URL('https://example.com/manifest.json')
      await assertCorpusError(httpUrl, 'invalid_manifest')
    })

    test('rejects an empty or whitespace instruction', async () => {
      const cases = createTenCases()
      cases[0]!.instruction = '   '
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'invalid_case')
    })

    test('rejects a sha256 digest mismatch', async () => {
      const cases = createTenCases()
      cases[0]!.sha256 = '0000000000000000000000000000000000000000000000000000000000000000'
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'digest_mismatch')
    })

    test('rejects an invalid case count', async () => {
      const cases = createTenCases().slice(0, 9)
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'invalid_case_count')
    })

    test('rejects a missing image file', async () => {
      const cases = createTenCases()
      cases[0]!.image = 'does-not-exist.jpg'
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'missing_image')
    })

    test('rejects an invalid or corrupt image upload', async () => {
      const cases = createTenCases()
      cases[0]!.image = 'corrupt.jpg'
      cases[0]!.sha256 = createHash('sha256')
        .update(Uint8Array.of(0x00, 0x11, 0x22))
        .digest('hex')
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'invalid_image')
    })

    test('rejects path traversal in image path', async () => {
      const cases = createTenCases()
      cases[0]!.image = '../secret.jpg'
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'invalid_case')
    })

    test('rejects absolute paths in image path', async () => {
      const cases = createTenCases()
      cases[0]!.image = '/etc/passwd'
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'invalid_case')
    })

    test('rejects non-HTTPS provenance URLs', async () => {
      const cases = createTenCases()
      cases[0]!.source.landingUrl = 'http://example.com/landing'
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'invalid_case')
    })

    test('rejects licenses other than CC BY 2.0', async () => {
      const cases = createTenCases()
      cases[0]!.source.licenseUrl = 'https://creativecommons.org/licenses/by-nc/2.0/'
      const manifestUrl = await writeManifest(cases)
      await assertCorpusError(manifestUrl, 'invalid_case')
    })

    test('rejects malformed manifest JSON', async () => {
      const manifestUrl = await writeManifest('{ broken json')
      await assertCorpusError(manifestUrl, 'invalid_manifest')
    })

    test('rejects non-array manifest JSON', async () => {
      const manifestUrl = await writeManifest({ not: 'an array' })
      await assertCorpusError(manifestUrl, 'invalid_manifest')
    })
  })
})
