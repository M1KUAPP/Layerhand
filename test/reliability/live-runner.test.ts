import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

import type { RunHandle } from '../../src/agent/contract'
import type { ManagedRun, RunStopReason } from '../../src/server/managed-run'
import type { ReliabilityCase } from '../../src/reliability/corpus'
import type { ReliabilityFailureCode, ReliabilitySummary } from '../../src/reliability/suite'
import {
  readReliabilityCommandConfig,
  runReliabilityCommand,
  type ReliabilityCommandConfig,
  type ReliabilityCommandDependencies
} from '../../scripts/run-reliability'

const validEnv: Record<string, string> = {
  OPENAI_API_KEY: 'sk-mock-key',
  BROWSERBASE_API_KEY: 'bb-mock-key',
  PUBLIC_URL: 'https://example.com'
}

function createTestCase(id: string): ReliabilityCase {
  return {
    id,
    category: 'product',
    imageUrl: new URL(`../images/${id}.jpg`, import.meta.url),
    sha256: 'abc123',
    instruction: `Retouch ${id}`,
    expectation: `Layered PSD for ${id}`,
    source: {
      openImagesId: '001',
      author: 'Tester',
      landingUrl: 'https://example.com/photo',
      downloadUrl: 'https://example.com/photo.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by/2.0/'
    }
  }
}

function createFakeManagedRun(): ManagedRun {
  const handle: RunHandle = {
    events: {
      async *[Symbol.asyncIterator]() {
        yield { type: 'started', runId: 'run-1', viewport: { width: 100, height: 100 } }
        yield {
          type: 'done',
          result: { psdUrl: 'captured:psd', previewUrl: 'captured:preview', layers: [], complete: true }
        }
      }
    },
    async steer() {},
    async cancel() {}
  }
  return {
    handle,
    metrics: () => ({ cacheHitRate: 0.8, stopReason: 'complete' }),
    releaseSecrets: () => {}
  }
}

function createMockSummary(passedCount: number): ReliabilitySummary {
  const total = 10
  const results = Array.from({ length: total }, (_, i) => ({
    id: `product-0${i + 1}`,
    category: (i < 5 ? 'product' : 'interior') as 'product' | 'interior',
    expectation: 'Good layers',
    outcome: (i < passedCount ? 'complete' : 'failed') as RunStopReason,
    passed: i < passedCount,
    steps: 12,
    costUsd: 1.5,
    tokensIn: 5000,
    tokensOut: 200,
    cacheHitRate: 0.85,
    failureCode: (i < passedCount ? null : 'run_failed') as ReliabilityFailureCode | null,
    refusedActions: 0
  }))

  return {
    startedAt: '2026-09-15T12:00:00.000Z',
    finishedAt: '2026-09-15T12:05:00.000Z',
    threshold: 8,
    total,
    passed: passedCount,
    meetsNfr1: passedCount >= 8,
    results
  }
}

describe('readReliabilityCommandConfig', () => {
  test('throws naming all missing variables together without echoing values', () => {
    let error: Error | undefined
    try {
      readReliabilityCommandConfig({}, [])
    } catch (e) {
      error = e as Error
    }

    expect(error).toBeDefined()
    expect(error?.message).toContain('OPENAI_API_KEY')
    expect(error?.message).toContain('BROWSERBASE_API_KEY')
    expect(error?.message).toContain('PUBLIC_URL')
  })

  test('names only missing variables when some are provided, never echoing secrets', () => {
    const secretValue = 'sk-super-secret-not-to-be-echoed'
    let error: Error | undefined
    try {
      readReliabilityCommandConfig({ OPENAI_API_KEY: secretValue }, [])
    } catch (e) {
      error = e as Error
    }

    expect(error).toBeDefined()
    expect(error?.message).not.toContain(secretValue)
    expect(error?.message).not.toContain('OPENAI_API_KEY')
    expect(error?.message).toContain('BROWSERBASE_API_KEY')
    expect(error?.message).toContain('PUBLIC_URL')
  })

  test('treats empty or whitespace-only variables as missing', () => {
    let error: Error | undefined
    try {
      readReliabilityCommandConfig(
        {
          OPENAI_API_KEY: '   ',
          BROWSERBASE_API_KEY: '',
          PUBLIC_URL: '\t\n'
        },
        []
      )
    } catch (e) {
      error = e as Error
    }

    expect(error).toBeDefined()
    expect(error?.message).toContain('OPENAI_API_KEY')
    expect(error?.message).toContain('BROWSERBASE_API_KEY')
    expect(error?.message).toContain('PUBLIC_URL')
  })

  test('uses default 40-step cap and $8 budget cap when unspecified', () => {
    const config = readReliabilityCommandConfig(validEnv, [])
    expect(config.openAiApiKey).toBe('sk-mock-key')
    expect(config.browserbaseApiKey).toBe('bb-mock-key')
    expect(config.publicUrl).toBe('https://example.com')
    expect(config.stepCap).toBe(40)
    expect(config.budgetUsd).toBe(8)
    expect(config.outputRoot.protocol).toBe('file:')
    expect(config.outputRoot.pathname.endsWith('/artifacts/reliability/')).toBe(true)
  })

  test('accepts custom step-cap and budget CLI arguments', () => {
    const config = readReliabilityCommandConfig(validEnv, ['--step-cap', '25', '--budget-usd', '6'])
    expect(config.stepCap).toBe(25)
    expect(config.budgetUsd).toBe(6)
  })

  test('accepts custom step-cap and budget from environment', () => {
    const config = readReliabilityCommandConfig(
      {
        ...validEnv,
        RELIABILITY_STEP_CAP: '30',
        RELIABILITY_BUDGET_USD: '5'
      },
      []
    )
    expect(config.stepCap).toBe(30)
    expect(config.budgetUsd).toBe(5)
  })

  test('fails on invalid numeric step-cap without echoing value', () => {
    const invalidValue = 'bad_step_cap_val'
    let error: Error | undefined
    try {
      readReliabilityCommandConfig(validEnv, ['--step-cap', invalidValue])
    } catch (e) {
      error = e as Error
    }
    expect(error).toBeDefined()
    expect(error?.message).not.toContain(invalidValue)
    expect(error?.message).toMatch(/step/i)
  })

  test('fails on non-positive integer step-cap', () => {
    expect(() => readReliabilityCommandConfig(validEnv, ['--step-cap', '0'])).toThrow()
    expect(() => readReliabilityCommandConfig(validEnv, ['--step-cap', '-5'])).toThrow()
    expect(() => readReliabilityCommandConfig(validEnv, ['--step-cap', '3.5'])).toThrow()
  })

  test('fails on invalid numeric budget without echoing value', () => {
    const invalidValue = 'bad_budget_val'
    let error: Error | undefined
    try {
      readReliabilityCommandConfig(validEnv, ['--budget-usd', invalidValue])
    } catch (e) {
      error = e as Error
    }
    expect(error).toBeDefined()
    expect(error?.message).not.toContain(invalidValue)
    expect(error?.message).toMatch(/budget/i)
  })

  test('fails on non-positive budget', () => {
    expect(() => readReliabilityCommandConfig(validEnv, ['--budget-usd', '0'])).toThrow()
    expect(() => readReliabilityCommandConfig(validEnv, ['--budget-usd', '-1'])).toThrow()
  })

  test('fails on invalid PUBLIC_URL without echoing value', () => {
    const invalidUrl = 'not-a-valid-http-url'
    let error: Error | undefined
    try {
      readReliabilityCommandConfig({ ...validEnv, PUBLIC_URL: invalidUrl }, [])
    } catch (e) {
      error = e as Error
    }
    expect(error).toBeDefined()
    expect(error?.message).not.toContain(invalidUrl)
    expect(error?.message).toMatch(/PUBLIC_URL/i)
  })

  test('accepts custom output directory argument', () => {
    const config = readReliabilityCommandConfig(validEnv, ['--output', '/tmp/custom-artifacts'])
    expect(config.outputRoot.protocol).toBe('file:')
    expect(fileURLToPath(config.outputRoot)).toBe('/tmp/custom-artifacts/')
  })
})

describe('runReliabilityCommand', () => {
  test('fails invalid numeric values before paid dependency creation', async () => {
    let clientCreated = 0
    const dependencies: ReliabilityCommandDependencies = {
      createBrowserbaseClient: () => {
        clientCreated += 1
        return {} as any
      },
      loadCorpus: async () => [createTestCase('c1')],
      runSuite: async () => createMockSummary(10),
      writeReport: async () => {},
      write: () => {}
    }

    const invalidConfig: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: -1,
      budgetUsd: 8
    }

    await expect(runReliabilityCommand(invalidConfig, dependencies)).rejects.toThrow()
    expect(clientCreated).toBe(0)
  })

  test('creates a single BrowserbaseClient for the entire suite', async () => {
    let clientsCreated: string[] = []
    let passedHostUrl = ''
    let sessionPassed: any = undefined

    const testCases = [createTestCase('case-1'), createTestCase('case-2')]

    const dependencies: ReliabilityCommandDependencies = {
      createBrowserbaseClient: (key: string) => {
        clientsCreated.push(key)
        return { clientInstanceId: 'single-client' } as any
      },
      loadCorpus: async () => testCases,
      runSuite: async ({ cases, startRun }) => {
        // Invoke startRun for each case to verify liveRun invocation
        for (const testCase of cases) {
          startRun({
            testCase,
            image: new Uint8Array([1, 2, 3]),
            publish: async () => 'cap'
          })
        }
        return createMockSummary(10)
      },
      liveRun: (request, editor: any) => {
        passedHostUrl = editor.hostUrl
        sessionPassed = editor.sessions
        return createFakeManagedRun()
      },
      writeReport: async () => {},
      write: () => {}
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test-key',
      browserbaseApiKey: 'bb-test-key',
      publicUrl: 'https://app.example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: 40,
      budgetUsd: 8
    }

    const exitCode = await runReliabilityCommand(config, dependencies)
    expect(exitCode).toBe(0)
    expect(clientsCreated).toEqual(['bb-test-key'])
    expect(passedHostUrl).toBe('https://app.example.com/photopea-host')
    expect(sessionPassed).toEqual({ clientInstanceId: 'single-client' })
  })

  test('loads manifest from test/images/manifest.json', async () => {
    let loadedManifestUrl: URL | undefined

    const dependencies: ReliabilityCommandDependencies = {
      loadCorpus: async (url) => {
        loadedManifestUrl = url
        return [createTestCase('c1')]
      },
      runSuite: async () => createMockSummary(10),
      writeReport: async () => {},
      write: () => {}
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: 40,
      budgetUsd: 8
    }

    await runReliabilityCommand(config, dependencies)
    expect(loadedManifestUrl).toBeDefined()
    expect(loadedManifestUrl?.pathname.endsWith('/test/images/manifest.json')).toBe(true)
  })

  test('writes report beneath timestamped directory without colons', async () => {
    let writtenDir: URL | undefined
    const fixedNow = new Date('2026-09-15T14:30:45.123Z')

    const dependencies: ReliabilityCommandDependencies = {
      loadCorpus: async () => [createTestCase('c1')],
      runSuite: async () => createMockSummary(10),
      writeReport: async (dir) => {
        writtenDir = dir
      },
      write: () => {},
      now: () => fixedNow
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/reliability-out/'),
      stepCap: 40,
      budgetUsd: 8
    }

    await runReliabilityCommand(config, dependencies)
    expect(writtenDir).toBeDefined()
    expect(writtenDir?.href).toBe('file:///tmp/reliability-out/2026-09-15T14-30-45.123Z/')
    expect(writtenDir?.pathname.endsWith('/2026-09-15T14-30-45.123Z/')).toBe(true)
    expect(writtenDir?.pathname.split('/').filter(Boolean).pop()?.includes(':')).toBe(false)
  })

  test('prints formatReliabilityTerminal output', async () => {
    let outputText = ''

    const dependencies: ReliabilityCommandDependencies = {
      loadCorpus: async () => [createTestCase('c1')],
      runSuite: async () => createMockSummary(10),
      writeReport: async () => {},
      write: (text) => {
        outputText += text
      }
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: 40,
      budgetUsd: 8
    }

    await runReliabilityCommand(config, dependencies)
    expect(outputText).toContain('10/10 passed')
    expect(outputText).toContain('product-01')
  })

  test('returns 0 when meeting NFR-1 threshold (>= 8/10)', async () => {
    const dependencies: ReliabilityCommandDependencies = {
      loadCorpus: async () => [createTestCase('c1')],
      runSuite: async () => createMockSummary(8),
      writeReport: async () => {},
      write: () => {}
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: 40,
      budgetUsd: 8
    }

    const exitCode = await runReliabilityCommand(config, dependencies)
    expect(exitCode).toBe(0)
  })

  test('returns 1 when below NFR-1 threshold (< 8/10)', async () => {
    const dependencies: ReliabilityCommandDependencies = {
      loadCorpus: async () => [createTestCase('c1')],
      runSuite: async () => createMockSummary(7),
      writeReport: async () => {},
      write: () => {}
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: 40,
      budgetUsd: 8
    }

    const exitCode = await runReliabilityCommand(config, dependencies)
    expect(exitCode).toBe(1)
  })

  test('registers and cleans up SIGINT and SIGTERM listeners on one AbortController', async () => {
    const initialSigint = process.listenerCount('SIGINT')
    const initialSigterm = process.listenerCount('SIGTERM')
    let signalReceived: AbortSignal | undefined

    const dependencies: ReliabilityCommandDependencies = {
      loadCorpus: async () => [createTestCase('c1')],
      runSuite: async ({ signal }) => {
        signalReceived = signal
        expect(process.listenerCount('SIGINT')).toBe(initialSigint + 1)
        expect(process.listenerCount('SIGTERM')).toBe(initialSigterm + 1)
        return createMockSummary(10)
      },
      writeReport: async () => {},
      write: () => {}
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: 40,
      budgetUsd: 8
    }

    await runReliabilityCommand(config, dependencies)

    expect(signalReceived).toBeDefined()
    expect(signalReceived?.aborted).toBe(false)
    expect(process.listenerCount('SIGINT')).toBe(initialSigint)
    expect(process.listenerCount('SIGTERM')).toBe(initialSigterm)
  })

  test('cleans up signal listeners even when suite throws', async () => {
    const initialSigint = process.listenerCount('SIGINT')
    const initialSigterm = process.listenerCount('SIGTERM')

    const dependencies: ReliabilityCommandDependencies = {
      loadCorpus: async () => [createTestCase('c1')],
      runSuite: async () => {
        throw new Error('Suite failed unexpectedly')
      },
      writeReport: async () => {},
      write: () => {}
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: 40,
      budgetUsd: 8
    }

    await expect(runReliabilityCommand(config, dependencies)).rejects.toThrow('Suite failed unexpectedly')
    expect(process.listenerCount('SIGINT')).toBe(initialSigint)
    expect(process.listenerCount('SIGTERM')).toBe(initialSigterm)
  })

  test('aborts signal on SIGINT emission', async () => {
    let signalAborted = false

    const dependencies: ReliabilityCommandDependencies = {
      loadCorpus: async () => [createTestCase('c1')],
      runSuite: async ({ signal }) => {
        process.emit('SIGINT')
        signalAborted = signal?.aborted ?? false
        return createMockSummary(0)
      },
      writeReport: async () => {},
      write: () => {}
    }

    const config: ReliabilityCommandConfig = {
      openAiApiKey: 'sk-test',
      browserbaseApiKey: 'bb-test',
      publicUrl: 'https://example.com',
      outputRoot: new URL('file:///tmp/artifacts/'),
      stepCap: 40,
      budgetUsd: 8
    }

    await runReliabilityCommand(config, dependencies)
    expect(signalAborted).toBe(true)
  })
})
