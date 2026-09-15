import { createHash } from 'node:crypto'
import { isAbsolute } from 'node:path'

import { validateImageUpload } from '../editor/image-upload'

export type ReliabilityCategory = 'product' | 'interior'

export interface ReliabilitySource {
  openImagesId: string
  author: string
  landingUrl: string
  downloadUrl: string
  licenseUrl: string
}

export interface ReliabilityCase {
  id: string
  category: ReliabilityCategory
  imageUrl: URL
  sha256: string
  instruction: string
  expectation: string
  source: ReliabilitySource
}

export type ReliabilityCorpusErrorCode =
  | 'invalid_manifest'
  | 'invalid_case_count'
  | 'invalid_category_split'
  | 'duplicate_case_id'
  | 'invalid_case'
  | 'missing_image'
  | 'digest_mismatch'
  | 'invalid_image'

export class ReliabilityCorpusError extends Error {
  constructor(readonly code: ReliabilityCorpusErrorCode) {
    super(code)
    this.name = 'ReliabilityCorpusError'
  }
}

const REQUIRED_LICENSE_URL = 'https://creativecommons.org/licenses/by/2.0/'
const EXPECTED_CASE_COUNT = 10
const EXPECTED_CATEGORY_COUNT = 5

function isValidHttpsUrl(urlString: unknown): urlString is string {
  if (typeof urlString !== 'string' || !urlString.trim()) {
    return false
  }
  try {
    const parsed = new URL(urlString)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidRelativeImagePath(imagePath: unknown): imagePath is string {
  if (typeof imagePath !== 'string' || !imagePath.trim()) {
    return false
  }
  if (
    isAbsolute(imagePath) ||
    imagePath.startsWith('/') ||
    imagePath.startsWith('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(imagePath) ||
    URL.canParse(imagePath)
  ) {
    return false
  }
  const segments = imagePath.split(/[/\\]/)
  return !segments.includes('..') && !segments.includes('.')
}

interface RawCase {
  id: string
  category: ReliabilityCategory
  image: string
  sha256: string
  instruction: string
  expectation: string
  source: ReliabilitySource
}

function parseAndValidateCase(raw: unknown): RawCase {
  if (typeof raw !== 'object' || raw === null) {
    throw new ReliabilityCorpusError('invalid_case')
  }

  const candidate = raw as Record<string, unknown>

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
    throw new ReliabilityCorpusError('invalid_case')
  }

  if (candidate.category !== 'product' && candidate.category !== 'interior') {
    throw new ReliabilityCorpusError('invalid_case')
  }

  if (!isValidRelativeImagePath(candidate.image)) {
    throw new ReliabilityCorpusError('invalid_case')
  }

  if (typeof candidate.sha256 !== 'string' || !/^[0-9a-fA-F]{64}$/.test(candidate.sha256.trim())) {
    throw new ReliabilityCorpusError('invalid_case')
  }

  if (typeof candidate.instruction !== 'string' || candidate.instruction.trim().length === 0) {
    throw new ReliabilityCorpusError('invalid_case')
  }

  if (typeof candidate.expectation !== 'string' || candidate.expectation.trim().length === 0) {
    throw new ReliabilityCorpusError('invalid_case')
  }

  if (typeof candidate.source !== 'object' || candidate.source === null) {
    throw new ReliabilityCorpusError('invalid_case')
  }

  const rawSource = candidate.source as Record<string, unknown>

  if (
    typeof rawSource.openImagesId !== 'string' ||
    rawSource.openImagesId.trim().length === 0 ||
    typeof rawSource.author !== 'string' ||
    rawSource.author.trim().length === 0 ||
    !isValidHttpsUrl(rawSource.landingUrl) ||
    !isValidHttpsUrl(rawSource.downloadUrl) ||
    rawSource.licenseUrl !== REQUIRED_LICENSE_URL
  ) {
    throw new ReliabilityCorpusError('invalid_case')
  }

  return {
    id: candidate.id.trim(),
    category: candidate.category,
    image: candidate.image.trim(),
    sha256: candidate.sha256.trim().toLowerCase(),
    instruction: candidate.instruction,
    expectation: candidate.expectation,
    source: {
      openImagesId: rawSource.openImagesId.trim(),
      author: rawSource.author.trim(),
      landingUrl: (rawSource.landingUrl as string).trim(),
      downloadUrl: (rawSource.downloadUrl as string).trim(),
      licenseUrl: REQUIRED_LICENSE_URL
    }
  }
}

export async function loadReliabilityCorpus(manifestUrl: URL): Promise<ReliabilityCase[]> {
  if (!(manifestUrl instanceof URL) || manifestUrl.protocol !== 'file:') {
    throw new ReliabilityCorpusError('invalid_manifest')
  }

  let text: string
  try {
    text = await Bun.file(manifestUrl).text()
  } catch {
    throw new ReliabilityCorpusError('invalid_manifest')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ReliabilityCorpusError('invalid_manifest')
  }

  if (!Array.isArray(parsed)) {
    throw new ReliabilityCorpusError('invalid_manifest')
  }

  if (parsed.length !== EXPECTED_CASE_COUNT) {
    throw new ReliabilityCorpusError('invalid_case_count')
  }

  const rawCases: RawCase[] = parsed.map(parseAndValidateCase)

  const productCount = rawCases.filter((c) => c.category === 'product').length
  const interiorCount = rawCases.filter((c) => c.category === 'interior').length
  if (productCount !== EXPECTED_CATEGORY_COUNT || interiorCount !== EXPECTED_CATEGORY_COUNT) {
    throw new ReliabilityCorpusError('invalid_category_split')
  }

  const seenIds = new Set<string>()
  for (const c of rawCases) {
    if (seenIds.has(c.id)) {
      throw new ReliabilityCorpusError('duplicate_case_id')
    }
    seenIds.add(c.id)
  }

  const loadedCases: ReliabilityCase[] = []
  for (const rawCase of rawCases) {
    const imageUrl = new URL(rawCase.image, manifestUrl)

    let bytes: Uint8Array
    try {
      bytes = await Bun.file(imageUrl).bytes()
    } catch {
      throw new ReliabilityCorpusError('missing_image')
    }

    const actualSha = createHash('sha256').update(bytes).digest('hex')
    if (actualSha !== rawCase.sha256) {
      throw new ReliabilityCorpusError('digest_mismatch')
    }

    try {
      validateImageUpload(bytes, rawCase.image)
    } catch {
      throw new ReliabilityCorpusError('invalid_image')
    }

    loadedCases.push({
      id: rawCase.id,
      category: rawCase.category,
      imageUrl,
      sha256: rawCase.sha256,
      instruction: rawCase.instruction,
      expectation: rawCase.expectation,
      source: rawCase.source
    })
  }

  return loadedCases
}
