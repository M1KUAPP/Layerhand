import type { PublishedKind } from '../agent/loop'
import { assertCompleteLayerTree, parsePsdMetadata, toLayerInfoTree } from '../editor'
import type { ManagedRun, RunStopReason } from '../server/managed-run'
import type { ReliabilityCase } from './corpus'

export interface ReliabilityPublish {
  (bytes: Uint8Array, kind: PublishedKind): Promise<string>
}

export interface StartReliabilityRunInput {
  testCase: ReliabilityCase
  image: Uint8Array
  publish: ReliabilityPublish
}

export type StartReliabilityRun = (input: StartReliabilityRunInput) => ManagedRun

export type ReliabilityFailureCode =
  'incomplete' | 'cancelled' | 'run_failed' | 'missing_psd' | 'invalid_psd' | 'invalid_layers'

export interface ReliabilityCaseResult {
  id: string
  category: ReliabilityCase['category']
  expectation: string
  outcome: RunStopReason
  passed: boolean
  steps: number
  costUsd: number
  tokensIn: number
  tokensOut: number
  cacheHitRate: number | null
  failureCode: ReliabilityFailureCode | null
  psd?: Uint8Array
  preview?: Uint8Array
}

export interface ReliabilitySummary {
  startedAt: string
  finishedAt: string
  threshold: 8
  total: number
  passed: number
  meetsNfr1: boolean
  results: ReliabilityCaseResult[]
}

export interface ReliabilitySuiteOptions {
  cases: readonly ReliabilityCase[]
  startRun: StartReliabilityRun
  now?: () => Date
  signal?: AbortSignal
}

async function loadCaseImage(imageUrl: URL): Promise<Uint8Array> {
  if (imageUrl.protocol === 'file:') {
    return await Bun.file(imageUrl).bytes()
  }
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.statusText}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

export async function runReliabilitySuite(options: ReliabilitySuiteOptions): Promise<ReliabilitySummary> {
  const now = options.now ?? (() => new Date())
  const startedAt = now().toISOString()
  const results: ReliabilityCaseResult[] = []

  for (const testCase of options.cases) {
    if (options.signal?.aborted) {
      break
    }

    let image: Uint8Array
    try {
      image = await loadCaseImage(testCase.imageUrl)
    } catch {
      results.push({
        id: testCase.id,
        category: testCase.category,
        expectation: testCase.expectation,
        outcome: 'failed',
        passed: false,
        steps: 0,
        costUsd: 0,
        tokensIn: 0,
        tokensOut: 0,
        cacheHitRate: null,
        failureCode: 'run_failed'
      })
      continue
    }

    let psdBytes: Uint8Array | undefined
    let previewBytes: Uint8Array | undefined

    const publish: ReliabilityPublish = async (bytes, kind) => {
      if (kind === 'psd') {
        psdBytes = bytes
        return 'captured:psd'
      }
      if (kind === 'preview') {
        previewBytes = bytes
        return 'captured:preview'
      }
      return 'captured:ignored'
    }

    let managed: ManagedRun | undefined
    let steps = 0
    let costUsd = 0
    let tokensIn = 0
    let tokensOut = 0
    let outcome: RunStopReason = 'failed'
    let cacheHitRate: number | null = null
    let abortListener: (() => void) | undefined

    try {
      managed = options.startRun({
        testCase,
        image,
        publish
      })

      if (options.signal) {
        if (options.signal.aborted) {
          void managed.handle.cancel().catch(() => {})
        } else {
          abortListener = () => {
            void managed?.handle.cancel().catch(() => {})
          }
          options.signal.addEventListener('abort', abortListener, { once: true })
        }
      }

      for await (const event of managed.handle.events) {
        if (event.type === 'step') {
          steps += 1
        } else if (event.type === 'cost') {
          costUsd = event.usd
          tokensIn = event.tokensIn
          tokensOut = event.tokensOut
        }
      }

      const metrics = managed.metrics()
      outcome = options.signal?.aborted ? 'cancelled' : metrics.stopReason
      cacheHitRate = metrics.cacheHitRate
    } catch {
      if (options.signal?.aborted) {
        outcome = 'cancelled'
      } else {
        outcome = 'failed'
      }
    } finally {
      if (abortListener && options.signal) {
        options.signal.removeEventListener('abort', abortListener)
      }
      if (managed) {
        try {
          managed.releaseSecrets()
        } catch {
          // Ignore error during release
        }
      }
    }

    let passed = false
    let failureCode: ReliabilityFailureCode | null = null

    if (outcome === 'complete') {
      if (!psdBytes || psdBytes.byteLength === 0) {
        passed = false
        failureCode = 'missing_psd'
      } else {
        try {
          const metadata = parsePsdMetadata(psdBytes)
          try {
            const layers = toLayerInfoTree(metadata.layers)
            assertCompleteLayerTree(layers)
            passed = true
            failureCode = null
          } catch {
            passed = false
            failureCode = 'invalid_layers'
          }
        } catch {
          passed = false
          failureCode = 'invalid_psd'
        }
      }
    } else if (outcome === 'step_cap' || outcome === 'spend_cap' || outcome === 'time_limit') {
      passed = false
      failureCode = 'incomplete'
    } else if (outcome === 'cancelled') {
      passed = false
      failureCode = 'cancelled'
    } else {
      passed = false
      failureCode = 'run_failed'
    }

    const caseResult: ReliabilityCaseResult = {
      id: testCase.id,
      category: testCase.category,
      expectation: testCase.expectation,
      outcome,
      passed,
      steps,
      costUsd,
      tokensIn,
      tokensOut,
      cacheHitRate,
      failureCode,
      ...(psdBytes ? { psd: psdBytes } : {}),
      ...(previewBytes ? { preview: previewBytes } : {})
    }

    results.push(caseResult)
  }

  const finishedAt = now().toISOString()
  const passedCount = results.filter((r) => r.passed).length

  return {
    startedAt,
    finishedAt,
    threshold: 8,
    total: options.cases.length,
    passed: passedCount,
    meetsNfr1: passedCount >= 8,
    results
  }
}
