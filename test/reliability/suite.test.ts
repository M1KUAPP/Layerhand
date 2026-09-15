import { describe, expect, test } from 'bun:test'
import { writePsd } from 'ag-psd'

import type { RunEvent, RunHandle } from '../../src/agent/contract'
import type { ManagedRun, RunStopReason } from '../../src/server/managed-run'
import type { ReliabilityCase } from '../../src/reliability/corpus'
import {
  runReliabilitySuite,
  type ReliabilityPublish,
  type ReliabilitySuiteOptions,
  type StartReliabilityRun,
  type StartReliabilityRunInput
} from '../../src/reliability/suite'

const sampleImageUrl = new URL('../images/product-eye-shadow.jpg', import.meta.url)
const sampleSha256 = 'dfb9b7f6983b5a89f0aa75daa794a8134e473adc9fc7c88fffd4d02db0ba6791'

const passingPsdUrl = new URL('../../src/editor/fixtures/photopea-production-export.psd', import.meta.url)

function createTestCase(id: string, category: 'product' | 'interior' = 'product'): ReliabilityCase {
  return {
    id,
    category,
    imageUrl: sampleImageUrl,
    sha256: sampleSha256,
    instruction: `Retouch ${id} with clean editable layers`,
    expectation: `High-quality result for ${id}`,
    source: {
      openImagesId: '0049980696be0a34',
      author: 'Test Author',
      landingUrl: 'https://flickr.example/photo',
      downloadUrl: 'https://download.example/photo.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by/2.0/'
    }
  }
}

interface ScriptedRunOptions {
  events?: RunEvent[]
  cacheHitRate?: number | null
  stopReason?: RunStopReason
  onPublish?: (publish: ReliabilityPublish) => Promise<void>
  onCancel?: () => Promise<void> | void
  onReleaseSecrets?: () => void
  onEventsStart?: () => void
  onEventsEnd?: () => void
}

function createScriptedRun(options: ScriptedRunOptions): ManagedRun {
  const events = options.events ?? []
  const stopReason = options.stopReason ?? 'complete'
  const cacheHitRate = options.cacheHitRate !== undefined ? options.cacheHitRate : 0.9

  const handle: RunHandle = {
    events: {
      async *[Symbol.asyncIterator]() {
        options.onEventsStart?.()
        try {
          for (const event of events) {
            yield event
          }
        } finally {
          options.onEventsEnd?.()
        }
      }
    },
    async steer() {},
    async cancel() {
      await options.onCancel?.()
    }
  }

  return {
    handle,
    metrics: () => ({ cacheHitRate, stopReason }),
    releaseSecrets: options.onReleaseSecrets ?? (() => undefined)
  }
}

async function getPassingPsd(): Promise<Uint8Array> {
  return await Bun.file(passingPsdUrl).bytes()
}

describe('runReliabilitySuite', () => {
  test('runs cases one at a time in manifest order', async () => {
    let inFlight = 0
    let maximumRunsInFlight = 0
    const startedIds: string[] = []

    const cases = [createTestCase('product-one', 'product'), createTestCase('interior-one', 'interior')]

    const startRun: StartReliabilityRun = ({ testCase }) => {
      startedIds.push(testCase.id)
      return createScriptedRun({
        events: [
          { type: 'started', runId: `run-${testCase.id}`, viewport: { width: 100, height: 100 } },
          {
            type: 'done',
            result: { psdUrl: 'captured:psd', previewUrl: 'captured:preview', layers: [], complete: true }
          }
        ],
        stopReason: 'complete',
        onEventsStart() {
          inFlight += 1
          maximumRunsInFlight = Math.max(maximumRunsInFlight, inFlight)
        },
        onEventsEnd() {
          inFlight -= 1
        }
      })
    }

    await runReliabilitySuite({ cases, startRun })

    expect(maximumRunsInFlight).toBe(1)
    expect(startedIds).toEqual(['product-one', 'interior-one'])
  })

  test('passes only a complete run with a valid editable PSD', async () => {
    const psdBytes = await getPassingPsd()
    const previewBytes = new Uint8Array([137, 80, 78, 71])
    const cases = [createTestCase('product-one', 'product')]

    const startRun: StartReliabilityRun = ({ publish }) => {
      return createScriptedRun({
        events: [
          { type: 'started', runId: 'run-1', viewport: { width: 100, height: 100 } },
          { type: 'step', n: 1, cap: 10, narration: 'Step 1' },
          { type: 'step', n: 2, cap: 10, narration: 'Step 2' },
          { type: 'step', n: 3, cap: 10, narration: 'Step 3' },
          { type: 'cost', usd: 0.2, tokensIn: 50, tokensOut: 25 },
          { type: 'cost', usd: 0.42, tokensIn: 100, tokensOut: 50 }
        ],
        stopReason: 'complete',
        cacheHitRate: 0.9,
        onEventsStart() {
          void publish(psdBytes, 'psd')
          void publish(previewBytes, 'preview')
        }
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun })

    expect(summary.results[0]).toMatchObject({
      outcome: 'complete',
      passed: true,
      steps: 3,
      costUsd: 0.42,
      cacheHitRate: 0.9,
      failureCode: null
    })
    expect(summary.results[0]?.psd).toEqual(psdBytes)
    expect(summary.results[0]?.preview).toEqual(previewBytes)
  })

  test.each([
    ['step_cap', 'incomplete'],
    ['spend_cap', 'incomplete'],
    ['time_limit', 'incomplete'],
    ['cancelled', 'cancelled'],
    ['failed', 'run_failed']
  ] as const)('fails %s without stopping later cases', async (outcome, failureCode) => {
    const passingPsdBytes = await getPassingPsd()
    const cases = [createTestCase('product-one', 'product'), createTestCase('interior-one', 'interior')]

    const startRun: StartReliabilityRun = ({ testCase, publish }) => {
      if (testCase.id === 'product-one') {
        return createScriptedRun({
          stopReason: outcome,
          events: [{ type: 'step', n: 1, cap: 10, narration: 'In progress' }]
        })
      }

      return createScriptedRun({
        stopReason: 'complete',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'Success' }],
        onEventsStart() {
          void publish(passingPsdBytes, 'psd')
        }
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun })

    expect(summary.results[0]).toMatchObject({ passed: false, outcome, failureCode })
    expect(summary.results[1]?.id).toBe('interior-one')
    expect(summary.results[1]?.passed).toBe(true)
  })

  test('fails with missing_psd when complete run does not publish PSD', async () => {
    const cases = [createTestCase('product-one')]
    const startRun: StartReliabilityRun = () => {
      return createScriptedRun({
        stopReason: 'complete',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'Finished' }]
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun })
    expect(summary.results[0]).toMatchObject({
      outcome: 'complete',
      passed: false,
      failureCode: 'missing_psd'
    })
  })

  test('fails with invalid_psd when published PSD bytes cannot be parsed', async () => {
    const cases = [createTestCase('product-one')]
    const startRun: StartReliabilityRun = ({ publish }) => {
      return createScriptedRun({
        stopReason: 'complete',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'Finished' }],
        onEventsStart() {
          void publish(new Uint8Array([1, 2, 3, 4, 5]), 'psd')
        }
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun })
    expect(summary.results[0]).toMatchObject({
      outcome: 'complete',
      passed: false,
      failureCode: 'invalid_psd'
    })
  })

  test('fails with invalid_layers when PSD has no editable layers', async () => {
    const invalidLayerPsd = new Uint8Array(
      writePsd(
        {
          width: 10,
          height: 10,
          children: [{ name: 'Layer 1' }]
        },
        { generateThumbnail: false }
      )
    )

    const cases = [createTestCase('product-one')]
    const startRun: StartReliabilityRun = ({ publish }) => {
      return createScriptedRun({
        stopReason: 'complete',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'Finished' }],
        onEventsStart() {
          void publish(invalidLayerPsd, 'psd')
        }
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun })
    expect(summary.results[0]).toMatchObject({
      outcome: 'complete',
      passed: false,
      failureCode: 'invalid_layers'
    })
  })

  test('the last cost event wins and step events are counted', async () => {
    const passingPsdBytes = await getPassingPsd()
    const cases = [createTestCase('product-one')]
    const startRun: StartReliabilityRun = ({ publish }) => {
      return createScriptedRun({
        stopReason: 'complete',
        events: [
          { type: 'step', n: 1, cap: 10, narration: 'Step 1' },
          { type: 'cost', usd: 0.1, tokensIn: 20, tokensOut: 10 },
          { type: 'step', n: 2, cap: 10, narration: 'Step 2' },
          { type: 'cost', usd: 0.35, tokensIn: 60, tokensOut: 30 },
          { type: 'step', n: 3, cap: 10, narration: 'Step 3' },
          { type: 'cost', usd: 0.75, tokensIn: 120, tokensOut: 70 }
        ],
        onEventsStart() {
          void publish(passingPsdBytes, 'psd')
        }
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun })
    expect(summary.results[0]).toMatchObject({
      steps: 3,
      costUsd: 0.75,
      tokensIn: 120,
      tokensOut: 70
    })
  })

  test('releaseSecrets() runs exactly once per run even on failures', async () => {
    const passingPsdBytes = await getPassingPsd()
    const cases = [createTestCase('case-success'), createTestCase('case-fail')]
    const releaseCalls: string[] = []

    const startRun: StartReliabilityRun = ({ testCase, publish }) => {
      return createScriptedRun({
        stopReason: testCase.id === 'case-success' ? 'complete' : 'failed',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'Run' }],
        onPublish: async (p) => {
          if (testCase.id === 'case-success') await p(passingPsdBytes, 'psd')
        },
        onReleaseSecrets() {
          releaseCalls.push(testCase.id)
        }
      })
    }

    await runReliabilitySuite({ cases, startRun })
    expect(releaseCalls).toEqual(['case-success', 'case-fail'])
  })

  test('frames and narrations do not enter results', async () => {
    const passingPsdBytes = await getPassingPsd()
    const frameBytes = new Uint8Array([255, 0, 0, 255])
    const cases = [createTestCase('product-one')]

    let framePublishResult: string | undefined
    const startRun: StartReliabilityRun = ({ publish }) => {
      return createScriptedRun({
        stopReason: 'complete',
        events: [
          { type: 'step', n: 1, cap: 10, narration: 'Super secret model narration' },
          { type: 'frame', pngUrl: 'https://secret.cdn/frame.png' }
        ],
        async onEventsStart() {
          framePublishResult = await publish(frameBytes, 'frame')
          await publish(passingPsdBytes, 'psd')
        }
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun })
    const result = summary.results[0] as unknown as Record<string, unknown>

    expect(framePublishResult).toBeDefined()
    expect(framePublishResult).not.toContain('base64')
    expect(result).not.toHaveProperty('frame')
    expect(result).not.toHaveProperty('pngUrl')
    expect(result).not.toHaveProperty('narration')
    expect(result.psd).toEqual(passingPsdBytes)
  })

  test('an aborted suite cancels its active run without starting another case', async () => {
    const controller = new AbortController()
    let run1Cancelled = false
    const startedIds: string[] = []

    const cases = [createTestCase('product-one'), createTestCase('interior-one')]

    const startRun: StartReliabilityRun = ({ testCase }) => {
      startedIds.push(testCase.id)
      return createScriptedRun({
        stopReason: 'cancelled',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'Working' }],
        onCancel() {
          run1Cancelled = true
        }
      })
    }

    // Trigger abort right before / during run 1
    const suitePromise = runReliabilitySuite({ cases, startRun, signal: controller.signal })
    controller.abort()
    const summary = await suitePromise

    expect(run1Cancelled).toBe(true)
    expect(startedIds).toEqual(['product-one'])
    expect(summary.results).toHaveLength(1)
    expect(summary.results[0]).toMatchObject({
      id: 'product-one',
      outcome: 'cancelled',
      failureCode: 'cancelled',
      passed: false
    })
  })

  test('computes threshold, meetsNfr1, startedAt and finishedAt', async () => {
    const passingPsdBytes = await getPassingPsd()
    const cases = Array.from({ length: 10 }, (_, i) => createTestCase(`case-${i}`))

    const times = [new Date('2026-09-15T12:00:00.000Z'), new Date('2026-09-15T12:05:00.000Z')]
    let timeIndex = 0
    const now = () => times[timeIndex++] ?? times[1]!

    // 8 passing, 2 failing
    const startRun: StartReliabilityRun = ({ testCase, publish }) => {
      const index = parseInt(testCase.id.replace('case-', ''), 10)
      const isPassing = index < 8

      return createScriptedRun({
        stopReason: isPassing ? 'complete' : 'failed',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'Step' }],
        onEventsStart() {
          if (isPassing) void publish(passingPsdBytes, 'psd')
        }
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun, now })

    expect(summary.startedAt).toBe('2026-09-15T12:00:00.000Z')
    expect(summary.finishedAt).toBe('2026-09-15T12:05:00.000Z')
    expect(summary.threshold).toBe(8)
    expect(summary.total).toBe(10)
    expect(summary.passed).toBe(8)
    expect(summary.meetsNfr1).toBe(true)

    // Verify 7 passes fails NFR-1
    const failCases = cases.slice(0, 10)
    timeIndex = 0
    const failingStartRun: StartReliabilityRun = ({ testCase, publish }) => {
      const index = parseInt(testCase.id.replace('case-', ''), 10)
      const isPassing = index < 7

      return createScriptedRun({
        stopReason: isPassing ? 'complete' : 'failed',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'Step' }],
        onEventsStart() {
          if (isPassing) void publish(passingPsdBytes, 'psd')
        }
      })
    }

    const failSummary = await runReliabilitySuite({ cases: failCases, startRun: failingStartRun, now })
    expect(failSummary.passed).toBe(7)
    expect(failSummary.meetsNfr1).toBe(false)
  })

  test('isolates errors if startRun throws or image reading fails', async () => {
    const passingPsdBytes = await getPassingPsd()
    const cases = [createTestCase('case-throw'), createTestCase('case-valid')]

    const startRun: StartReliabilityRun = ({ testCase, publish }) => {
      if (testCase.id === 'case-throw') {
        throw new Error('Explosion during start')
      }
      return createScriptedRun({
        stopReason: 'complete',
        events: [{ type: 'step', n: 1, cap: 10, narration: 'OK' }],
        onEventsStart() {
          void publish(passingPsdBytes, 'psd')
        }
      })
    }

    const summary = await runReliabilitySuite({ cases, startRun })
    expect(summary.results[0]).toMatchObject({
      id: 'case-throw',
      outcome: 'failed',
      passed: false,
      failureCode: 'run_failed'
    })
    expect(summary.results[1]).toMatchObject({
      id: 'case-valid',
      outcome: 'complete',
      passed: true,
      failureCode: null
    })
  })
})
