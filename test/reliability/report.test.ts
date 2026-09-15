import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import type { ReliabilityCaseResult, ReliabilitySummary } from '../../src/reliability/suite'
import {
  formatReliabilityMarkdown,
  formatReliabilityTerminal,
  serializableReliabilitySummary,
  writeReliabilityReport
} from '../../src/reliability/report'

function createSampleSummary(overrides?: Partial<ReliabilitySummary>): ReliabilitySummary {
  const passingResult: ReliabilityCaseResult = {
    id: 'product-one',
    category: 'product',
    expectation: 'Clean product image on neutral background',
    outcome: 'complete',
    passed: true,
    steps: 3,
    costUsd: 0.42,
    tokensIn: 1200,
    tokensOut: 600,
    cacheHitRate: 0.9,
    failureCode: null,
    psd: new Uint8Array([0x38, 0x42, 0x50, 0x53, 0x00, 0x01]),
    preview: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
  }

  const failingResult: ReliabilityCaseResult = {
    id: 'interior-two',
    category: 'interior',
    expectation: 'Evenly balanced lighting in bedroom',
    outcome: 'step_cap',
    passed: false,
    steps: 40,
    costUsd: 8.0,
    tokensIn: 15000,
    tokensOut: 4500,
    cacheHitRate: null,
    failureCode: 'incomplete'
  }

  return {
    startedAt: '2026-09-15T10:00:00.000Z',
    finishedAt: '2026-09-15T10:05:00.000Z',
    threshold: 8,
    total: 2,
    passed: 1,
    meetsNfr1: false,
    results: [passingResult, failingResult],
    ...overrides
  }
}

describe('reliability reporting', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'report-test-'))
  })

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  test('formats terminal output with compact rows and pass summary', () => {
    const summary = createSampleSummary()
    const terminal = formatReliabilityTerminal(summary)

    expect(terminal).toContain('1/2 passed')
    expect(terminal).toContain('product-one')
    expect(terminal).toContain('interior-two')
    expect(terminal).toContain('complete')
    expect(terminal).toContain('step_cap')
    expect(terminal).toContain('$0.42')
    expect(terminal).toContain('$8.00')
    expect(terminal).toContain('90%')
    expect(terminal).toContain('n/a')
    expect(terminal).toContain('pass')
    expect(terminal).toContain('incomplete')

    // Terminal row should contain only the required fields
    const lines = terminal.trim().split('\n')
    expect(lines).toHaveLength(3) // 2 case rows + 1 summary row
    expect(lines[0]).toBe('product-one product complete 3 $0.42 90% pass')
    expect(lines[1]).toBe('interior-two interior step_cap 40 $8.00 n/a incomplete')
    expect(lines[2]).toBe('1/2 passed')
  })

  test('formats markdown output with exact table row formatting', () => {
    const summary = createSampleSummary()
    const markdown = formatReliabilityMarkdown(summary)

    expect(markdown).toContain('| product-one | product | complete | 3 | $0.42 | 90% | pass |')
    expect(markdown).toContain('| interior-two | interior | step_cap | 40 | $8.00 | n/a | incomplete |')
    expect(markdown).toContain('1/2 passed')
  })

  test('omits binary arrays from serializable summary while keeping metadata', () => {
    const summary = createSampleSummary()
    const serializable = serializableReliabilitySummary(summary)

    expect(serializable.results[0]).not.toHaveProperty('psd')
    expect(serializable.results[0]).not.toHaveProperty('preview')
    expect(serializable.results[0]).toMatchObject({
      id: 'product-one',
      category: 'product',
      expectation: 'Clean product image on neutral background',
      outcome: 'complete',
      passed: true,
      steps: 3,
      costUsd: 0.42,
      tokensIn: 1200,
      tokensOut: 600,
      cacheHitRate: 0.9,
      failureCode: null
    })
    expect(serializable.results[1]).not.toHaveProperty('psd')
    expect(serializable.results[1]).not.toHaveProperty('preview')
    expect(serializable.total).toBe(2)
    expect(serializable.passed).toBe(1)
    expect(serializable.meetsNfr1).toBe(false)
  })

  test('persists summary.json, summary.md, and available binary artifacts to disk', async () => {
    const summary = createSampleSummary()
    const outputUrl = pathToFileURL(tempDir + '/')

    await writeReliabilityReport(outputUrl, summary)

    // Check summary.json
    const jsonContent = await readFile(join(tempDir, 'summary.json'), 'utf-8')
    const parsedJson = JSON.parse(jsonContent)
    expect(parsedJson.total).toBe(2)
    expect(parsedJson.passed).toBe(1)
    expect(parsedJson.results[0]).not.toHaveProperty('psd')
    expect(parsedJson.results[0]).not.toHaveProperty('preview')
    expect(parsedJson.results[0].id).toBe('product-one')

    // Check summary.md
    const mdContent = await readFile(join(tempDir, 'summary.md'), 'utf-8')
    expect(mdContent).toContain('| product-one | product | complete | 3 | $0.42 | 90% | pass |')
    expect(mdContent).toContain('1/2 passed')

    // Check binaries for product-one (both psd and preview present)
    const psdBytes = await readFile(join(tempDir, 'product-one', 'result.psd'))
    expect(psdBytes).toEqual(Buffer.from([0x38, 0x42, 0x50, 0x53, 0x00, 0x01]))

    const previewBytes = await readFile(join(tempDir, 'product-one', 'preview.png'))
    expect(previewBytes).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))

    // Check that no directory/files were written for interior-two (no binaries)
    const interiorTwoExists = await Bun.file(join(tempDir, 'interior-two')).exists()
    expect(interiorTwoExists).toBe(false)
  })

  test('redacts secrets, CDP URLs, frame URLs, and narrations from reports', async () => {
    const summary = createSampleSummary()
    const targetResult = summary.results[0]
    expect(targetResult).toBeDefined()
    if (!targetResult) {
      throw new Error('Expected at least one result')
    }
    // Inject suspicious data into expectation and attached fields
    targetResult.expectation =
      'Check sk-secret123 key with wss://cdp.browserbase.com/session and data:image/png;base64,deadbeef'
    const dirtyResult = targetResult as unknown as Record<string, unknown>
    dirtyResult.narration = 'I am retouching the layer right now'
    dirtyResult.apiKey = 'sk-secret123'
    dirtyResult.cdpUrl = 'wss://cdp.browserbase.com/live'
    dirtyResult.frameUrl = 'https://example.com/frame-001.png'

    const outputUrl = pathToFileURL(tempDir + '/')
    await writeReliabilityReport(outputUrl, summary)

    const terminal = formatReliabilityTerminal(summary)
    const markdown = formatReliabilityMarkdown(summary)
    const jsonText = await readFile(join(tempDir, 'summary.json'), 'utf-8')
    const mdText = await readFile(join(tempDir, 'summary.md'), 'utf-8')

    for (const output of [terminal, markdown, jsonText, mdText]) {
      expect(output).not.toContain('sk-secret123')
      expect(output).not.toContain('wss://')
      expect(output).not.toContain('data:image')
      expect(output).not.toContain('narration')
      expect(output).not.toContain('frame-001')
      expect(output).not.toContain('I am retouching')
    }
  })

  test('rejects unsafe case ids to prevent path traversal and writes no report output', async () => {
    const summary = createSampleSummary()
    const targetResult = summary.results[0]
    expect(targetResult).toBeDefined()
    if (!targetResult) {
      throw new Error('Expected at least one result')
    }
    targetResult.id = '../../evil-case'
    const outputUrl = pathToFileURL(tempDir + '/')

    await expect(writeReliabilityReport(outputUrl, summary)).rejects.toThrow('Invalid case id')
    const summaryJsonExists = await Bun.file(join(tempDir, 'summary.json')).exists()
    const summaryMdExists = await Bun.file(join(tempDir, 'summary.md')).exists()
    expect(summaryJsonExists).toBe(false)
    expect(summaryMdExists).toBe(false)
  })

  test('rejects unsafe case ids on cases without binary artifacts before writing report output', async () => {
    const summary = createSampleSummary()
    const targetResult = summary.results[1]
    expect(targetResult).toBeDefined()
    if (!targetResult) {
      throw new Error('Expected at least one result')
    }
    expect(targetResult.psd).toBeUndefined()
    expect(targetResult.preview).toBeUndefined()
    targetResult.id = '../evil-no-artifacts'
    const outputUrl = pathToFileURL(tempDir + '/')

    await expect(writeReliabilityReport(outputUrl, summary)).rejects.toThrow('Invalid case id')
    const summaryJsonExists = await Bun.file(join(tempDir, 'summary.json')).exists()
    const summaryMdExists = await Bun.file(join(tempDir, 'summary.md')).exists()
    expect(summaryJsonExists).toBe(false)
    expect(summaryMdExists).toBe(false)
  })

  test('rejects non-file output directory URLs', async () => {
    const summary = createSampleSummary()
    const httpUrl = new URL('https://example.com/reports')

    await expect(writeReliabilityReport(httpUrl, summary)).rejects.toThrow('file:')
  })
})
