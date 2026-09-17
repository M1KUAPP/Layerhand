import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ReliabilityCaseResult, ReliabilitySummary } from './suite'

export interface SerializableReliabilityCaseResult extends Omit<ReliabilityCaseResult, 'psd' | 'preview'> {}

export interface SerializableReliabilitySummary extends Omit<ReliabilitySummary, 'results'> {
  results: SerializableReliabilityCaseResult[]
}

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]+/g,
  /bb_[a-zA-Z0-9_-]+/g,
  /wss:\/\/[^\s"'`]+/g,
  /data:image\/[^;]+;base64,[^\s"'`]+/g,
  /https?:\/\/[^\s"'`]*frame[^\s"'`]*/gi
]

export function redactSecrets(text: string): string {
  let redacted = text
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]')
  }
  return redacted
}

export function validateCaseId(id: string): string {
  const trimmed = id.trim()
  if (
    !trimmed ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('..') ||
    !/^[a-zA-Z0-9_-]+$/.test(trimmed)
  ) {
    throw new Error(`Invalid case id for report directory: ${id}`)
  }
  return trimmed
}

export function serializableReliabilitySummary(summary: ReliabilitySummary): SerializableReliabilitySummary {
  return {
    startedAt: summary.startedAt,
    finishedAt: summary.finishedAt,
    threshold: summary.threshold,
    total: summary.total,
    passed: summary.passed,
    meetsNfr1: summary.meetsNfr1,
    results: summary.results.map((result) => ({
      id: redactSecrets(result.id),
      category: result.category,
      expectation: redactSecrets(result.expectation),
      outcome: result.outcome,
      passed: result.passed,
      steps: result.steps,
      costUsd: result.costUsd,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      cacheHitRate: result.cacheHitRate,
      failureCode: result.failureCode,
      refusedActions: result.refusedActions
    }))
  }
}

function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(2)}`
}

function formatCacheRate(cacheHitRate: number | null): string {
  return cacheHitRate !== null && cacheHitRate !== undefined ? `${Math.round(cacheHitRate * 100)}%` : 'n/a'
}

function formatStatus(result: ReliabilityCaseResult): string {
  return result.passed ? 'pass' : (result.failureCode ?? 'failed')
}

export function formatReliabilityTerminal(summary: ReliabilitySummary): string {
  const lines: string[] = []

  for (const result of summary.results) {
    const row = [
      redactSecrets(result.id),
      result.category,
      result.outcome,
      String(result.steps),
      formatCost(result.costUsd),
      formatCacheRate(result.cacheHitRate),
      formatStatus(result)
    ].join(' ')
    lines.push(redactSecrets(row))
  }

  lines.push(`${summary.passed}/${summary.total} passed`)
  return lines.join('\n')
}

export function formatReliabilityMarkdown(summary: ReliabilitySummary): string {
  const rows = summary.results.map((result) => {
    const cells = [
      redactSecrets(result.id),
      result.category,
      result.outcome,
      String(result.steps),
      formatCost(result.costUsd),
      formatCacheRate(result.cacheHitRate),
      formatStatus(result)
    ]
    return `| ${cells.join(' | ')} |`
  })

  return [
    '# Reliability Suite Summary',
    '',
    `${summary.passed}/${summary.total} passed (threshold: ${summary.threshold})`,
    '',
    '| Case | Category | Outcome | Steps | Cost | Cache | Result |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows
  ].join('\n')
}

export async function writeReliabilityReport(outputDirectory: URL, summary: ReliabilitySummary): Promise<void> {
  if (outputDirectory.protocol !== 'file:') {
    throw new Error(`outputDirectory must have file: protocol, got ${outputDirectory.protocol}`)
  }

  for (const result of summary.results) {
    validateCaseId(result.id)
  }

  const dirPath = fileURLToPath(outputDirectory)
  await mkdir(dirPath, { recursive: true })

  const serializable = serializableReliabilitySummary(summary)
  const jsonContent = JSON.stringify(serializable, null, 2) + '\n'
  await writeFile(join(dirPath, 'summary.json'), jsonContent, 'utf-8')

  const markdownContent = formatReliabilityMarkdown(summary) + '\n'
  await writeFile(join(dirPath, 'summary.md'), markdownContent, 'utf-8')

  for (const result of summary.results) {
    if (result.psd !== undefined || result.preview !== undefined) {
      const validatedId = validateCaseId(result.id)
      const caseDir = join(dirPath, validatedId)
      await mkdir(caseDir, { recursive: true })

      if (result.psd !== undefined) {
        await writeFile(join(caseDir, 'result.psd'), result.psd)
      }
      if (result.preview !== undefined) {
        await writeFile(join(caseDir, 'preview.png'), result.preview)
      }
    }
  }
}
