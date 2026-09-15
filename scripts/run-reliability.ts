import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

import { loadReliabilityCorpus } from '../src/reliability/corpus'
import { formatReliabilityTerminal, writeReliabilityReport } from '../src/reliability/report'
import { runReliabilitySuite, type ReliabilitySummary, type StartReliabilityRun } from '../src/reliability/suite'
import { liveAgentRun } from '../src/server/agent-run'
import { BrowserbaseClient } from '../src/server/browserbase-client'
import { ConfigurationError } from '../src/server/config'
import { photopeaHostUrl } from '../src/server/runtime'

export interface ReliabilityCommandConfig {
  openAiApiKey: string
  browserbaseApiKey: string
  publicUrl: string
  outputRoot: URL
  stepCap: number
  budgetUsd: number
}

const DEFAULT_STEP_CAP = 40
const DEFAULT_BUDGET_USD = 8
const REQUIRED_ENV_VARS = ['OPENAI_API_KEY', 'BROWSERBASE_API_KEY', 'PUBLIC_URL'] as const

function parsePositiveInteger(name: string, value: string): number {
  const number = Number(value)
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(number) || number <= 0) {
    throw new ConfigurationError(`${name} must be a positive integer`)
  }
  return number
}

function parsePositiveDecimal(name: string, value: string): number {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new ConfigurationError(`${name} must be a positive decimal number`)
  }
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) {
    throw new ConfigurationError(`${name} must be a positive decimal number`)
  }
  return number
}

function parseOutputRoot(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    url = pathToFileURL(resolve(raw))
  }
  if (url.protocol !== 'file:') {
    throw new ConfigurationError('Output directory must be a file URL or path')
  }
  return url.href.endsWith('/') ? url : new URL(`${url.href}/`)
}

export function readReliabilityCommandConfig(
  env: Record<string, string | undefined>,
  args: readonly string[]
): ReliabilityCommandConfig {
  const missing = REQUIRED_ENV_VARS.filter((name) => !env[name]?.trim())
  if (missing.length > 0) {
    throw new ConfigurationError(`Missing required environment variables: ${missing.join(', ')}`)
  }

  const openAiApiKey = env.OPENAI_API_KEY!.trim()
  const browserbaseApiKey = env.BROWSERBASE_API_KEY!.trim()
  const rawPublicUrl = env.PUBLIC_URL!.trim()

  // Validates PUBLIC_URL protocol without echoing the value
  photopeaHostUrl(rawPublicUrl)

  const { values } = parseArgs({
    args: [...args],
    allowPositionals: true,
    strict: false,
    options: {
      'step-cap': { type: 'string' },
      budget: { type: 'string' },
      'budget-usd': { type: 'string' },
      output: { type: 'string' },
      'output-dir': { type: 'string' },
      'output-root': { type: 'string' }
    }
  })

  let stepCap = DEFAULT_STEP_CAP
  if (typeof values['step-cap'] === 'string') {
    stepCap = parsePositiveInteger('stepCap', values['step-cap'])
  } else if (env.RELIABILITY_STEP_CAP !== undefined) {
    stepCap = parsePositiveInteger('stepCap', env.RELIABILITY_STEP_CAP)
  } else if (env.RUN_STEP_CAP !== undefined) {
    stepCap = parsePositiveInteger('stepCap', env.RUN_STEP_CAP)
  }

  let budgetUsd = DEFAULT_BUDGET_USD
  const rawBudget = values['budget-usd'] ?? values.budget
  if (typeof rawBudget === 'string') {
    budgetUsd = parsePositiveDecimal('budgetUsd', rawBudget)
  } else if (env.RELIABILITY_BUDGET_USD !== undefined) {
    budgetUsd = parsePositiveDecimal('budgetUsd', env.RELIABILITY_BUDGET_USD)
  }

  let outputRoot: URL
  const rawOutput = values['output-root'] ?? values['output-dir'] ?? values.output ?? env.RELIABILITY_OUTPUT_DIR
  if (typeof rawOutput === 'string') {
    outputRoot = parseOutputRoot(rawOutput)
  } else {
    outputRoot = new URL('../artifacts/reliability/', import.meta.url)
  }

  return {
    openAiApiKey,
    browserbaseApiKey,
    publicUrl: rawPublicUrl,
    outputRoot,
    stepCap,
    budgetUsd
  }
}

export interface ReliabilityCommandDependencies {
  loadCorpus?: typeof loadReliabilityCorpus
  runSuite?: typeof runReliabilitySuite
  writeReport?: typeof writeReliabilityReport
  write?: (text: string) => void
  now?: () => Date
  createBrowserbaseClient?: (apiKey: string) => BrowserbaseClient
  liveRun?: typeof liveAgentRun
}

export async function runReliabilityCommand(
  config: ReliabilityCommandConfig,
  dependencies?: ReliabilityCommandDependencies
): Promise<number> {
  if (!Number.isSafeInteger(config.stepCap) || config.stepCap <= 0) {
    throw new ConfigurationError('stepCap must be a positive integer')
  }
  if (!Number.isFinite(config.budgetUsd) || config.budgetUsd <= 0) {
    throw new ConfigurationError('budgetUsd must be a positive decimal number')
  }
  if (!config.openAiApiKey?.trim() || !config.browserbaseApiKey?.trim() || !config.publicUrl?.trim()) {
    throw new ConfigurationError('Missing required credentials or public URL')
  }

  const hostUrl = photopeaHostUrl(config.publicUrl)

  const loadCorpus = dependencies?.loadCorpus ?? loadReliabilityCorpus
  const runSuite = dependencies?.runSuite ?? runReliabilitySuite
  const writeReport = dependencies?.writeReport ?? writeReliabilityReport
  const write = dependencies?.write ?? ((text: string) => process.stdout.write(`${text}\n`))
  const now = dependencies?.now ?? (() => new Date())
  const createBrowserbase = dependencies?.createBrowserbaseClient ?? ((apiKey: string) => new BrowserbaseClient(apiKey))
  const liveRun = dependencies?.liveRun ?? liveAgentRun

  const manifestUrl = new URL('../test/images/manifest.json', import.meta.url)
  const cases = await loadCorpus(manifestUrl)

  const browserbaseClient = createBrowserbase(config.browserbaseApiKey)

  const controller = new AbortController()
  const handleSignal = () => {
    controller.abort()
  }

  process.on('SIGINT', handleSignal)
  process.on('SIGTERM', handleSignal)

  let summary: ReliabilitySummary
  try {
    const startRun: StartReliabilityRun = ({ testCase, image, publish }) => {
      const filename = testCase.imageUrl.pathname.split('/').pop() || `${testCase.id}.jpg`
      return liveRun(
        {
          image,
          filename,
          instruction: testCase.instruction,
          stepCap: config.stepCap,
          budgetUsd: config.budgetUsd,
          apiKey: config.openAiApiKey
        },
        {
          hostUrl,
          sessions: browserbaseClient,
          publish
        }
      )
    }

    summary = await runSuite({
      cases,
      startRun,
      now,
      signal: controller.signal
    })
  } finally {
    process.off('SIGINT', handleSignal)
    process.off('SIGTERM', handleSignal)
  }

  const timestampDir = now().toISOString().replaceAll(':', '-')
  const normalizedOutputRoot = config.outputRoot.href.endsWith('/')
    ? config.outputRoot
    : new URL(`${config.outputRoot.href}/`)
  const reportDir = new URL(`${timestampDir}/`, normalizedOutputRoot)
  await writeReport(reportDir, summary)

  write(formatReliabilityTerminal(summary))

  return summary.meetsNfr1 ? 0 : 1
}

if (import.meta.main) {
  try {
    const config = readReliabilityCommandConfig(process.env, Bun.argv.slice(2))
    const exitCode = await runReliabilityCommand(config)
    process.exit(exitCode)
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message)
    } else {
      console.error('Reliability run failed.')
    }
    process.exit(1)
  }
}
