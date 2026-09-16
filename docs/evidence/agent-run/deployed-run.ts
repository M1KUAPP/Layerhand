// Runs the cache acceptance profile through the deployed Layerhand API. The
// deployment owns its model and browser credentials; this harness receives
// only DATABASE_URL so it can read the persisted cache metric for this run.
//
//   DATABASE_URL=... PUBLIC_URL=... bun run docs/evidence/agent-run/deployed-run.ts [public URL] [image] [--profile cache-acceptance]
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { SQL } from 'bun'

import type { RunSnapshot } from '../../../src/server/run-registry'
import { decodeRunSnapshot } from '../../../src/web/api'
import {
  agentRunProfile,
  evaluateAgentRunAcceptance,
  type AgentRunAcceptanceResult,
  type AgentRunProfile
} from './profiles'

const DEFAULT_TIMEOUT_MS = 15 * 60_000
const DEFAULT_POLL_INTERVAL_MS = 2_000
const DEFAULT_RUN_LOG_ATTEMPTS = 30

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface PersistedRunMetrics {
  outcome: string
  steps: number
  cacheHitRate: number | null
  failureCode: string | null
}

export interface DeployedRunOptions {
  baseUrl: string
  image: Uint8Array
  filename: string
  profile: AgentRunProfile
  timeoutMs?: number
  pollIntervalMs?: number
  runLogAttempts?: number
}

export interface DeployedRunDependencies {
  fetch?: Fetch
  sleep?(milliseconds: number): Promise<void>
  readRunLog(runId: string): Promise<PersistedRunMetrics | null>
  now?(): number
  progress?(snapshot: RunSnapshot): void
}

export interface DeployedRunSummary {
  label: string
  profile: AgentRunProfile['name']
  instruction: string
  image: string
  publicUrl: string
  runId: string
  outcome: string
  steps: number
  costUsd: number
  tokensIn: number
  tokensOut: number
  cacheHitRate: number | null
  failureCode: string | null
  browserReleaseEvidence: 'runtime-release-attempt-before-done'
  harnessError: string | null
  acceptance: AgentRunAcceptanceResult | null
  layers: RunSnapshot['result'] extends infer Result ? (Result extends { layers: infer Layers } ? Layers : null) : null
  errors: string[]
}

export interface DeployedRunEvidence {
  summary: DeployedRunSummary
  psd?: Uint8Array
  preview?: Uint8Array
  lastFrame?: Uint8Array
}

export class DeployedRunError extends Error {
  readonly runId: string | null
  readonly snapshot: RunSnapshot | null

  constructor(message: string, runId: string | null, snapshot: RunSnapshot | null) {
    super(message)
    this.name = 'DeployedRunError'
    this.runId = runId
    this.snapshot = snapshot
  }
}

function apiUrl(baseUrl: string, path: string): string {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return new URL(path.replace(/^\//, ''), normalized).href
}

function cookieFrom(response: Response): string | undefined {
  const header = response.headers.get('set-cookie')
  return header?.split(';')[0]
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new Error(`The deployed API answered ${response.status} with invalid JSON`)
  }
}

function runIdFrom(value: unknown): string {
  if (!value || typeof value !== 'object' || typeof (value as { runId?: unknown }).runId !== 'string') {
    throw new Error('The deployed API did not return a run id')
  }
  return (value as { runId: string }).runId
}

function imageType(filename: string): string {
  return extname(filename).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'
}

function dataPng(value: string | null): Uint8Array | undefined {
  const prefix = 'data:image/png;base64,'
  if (!value?.startsWith(prefix)) return undefined
  return new Uint8Array(Buffer.from(value.slice(prefix.length), 'base64'))
}

async function download(fetchImplementation: Fetch, url: string, label: string): Promise<Uint8Array> {
  const response = await fetchImplementation(url)
  if (!response.ok) throw new Error(`The ${label} download answered ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

async function persistedMetrics(
  runId: string,
  attempts: number,
  sleep: (milliseconds: number) => Promise<void>,
  readRunLog: DeployedRunDependencies['readRunLog'],
  pollIntervalMs: number
): Promise<PersistedRunMetrics | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const metrics = await readRunLog(runId)
    if (metrics) return metrics
    if (attempt + 1 < attempts) await sleep(pollIntervalMs)
  }
  return null
}

function acceptanceOutcome(
  snapshot: RunSnapshot,
  metrics: PersistedRunMetrics | null
): 'complete' | 'incomplete' | 'failed' {
  if ((!metrics || metrics.outcome === 'complete') && snapshot.status === 'complete') return 'complete'
  if (snapshot.status === 'incomplete') return 'incomplete'
  return 'failed'
}

/**
 * Starts one run and waits for its terminal snapshot and run-log row. A done
 * event is published only after the editor's close path has attempted the
 * Browserbase release. That proves ordering and an attempted release, not the
 * provider's resulting status; provider-level release remains covered by the
 * direct harness and the browser lifecycle tests.
 */
export async function runDeployedAgentAcceptance(
  options: DeployedRunOptions,
  dependencies: DeployedRunDependencies
): Promise<DeployedRunEvidence> {
  const fetchImplementation = dependencies.fetch ?? globalThis.fetch.bind(globalThis)
  const sleep = dependencies.sleep ?? Bun.sleep
  const now = dependencies.now ?? Date.now
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const deadline = now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  const form = new FormData()
  const image = new File([options.image.slice() as unknown as BlobPart], options.filename, {
    type: imageType(options.filename)
  })
  form.set('image', image, options.filename)
  form.set('filename', options.filename)
  form.set('instruction', options.profile.instruction)

  let runId: string | null = null
  let snapshot: RunSnapshot | null = null
  try {
    const start = await fetchImplementation(apiUrl(options.baseUrl, '/api/runs'), { method: 'POST', body: form })
    const startBody = await responseJson(start)
    if (!start.ok) throw new Error(`The deployed API refused the run with HTTP ${start.status}`)
    runId = runIdFrom(startBody)
    const cookie = cookieFrom(start)

    for (;;) {
      const response = await fetchImplementation(apiUrl(options.baseUrl, `/api/runs/${encodeURIComponent(runId)}`), {
        ...(cookie ? { headers: { cookie } } : {})
      })
      if (!response.ok) throw new Error(`The run snapshot answered ${response.status}`)
      snapshot = decodeRunSnapshot(await responseJson(response))
      dependencies.progress?.(snapshot)
      if (snapshot.status !== 'running') break
      if (now() >= deadline) {
        await fetchImplementation(apiUrl(options.baseUrl, `/api/runs/${encodeURIComponent(runId)}/cancel`), {
          method: 'POST',
          ...(cookie ? { headers: { cookie } } : {})
        }).catch(() => undefined)
        throw new Error(`Run ${runId} did not finish before the acceptance timeout`)
      }
      await sleep(pollIntervalMs)
    }

    const metrics = await persistedMetrics(
      runId,
      options.runLogAttempts ?? DEFAULT_RUN_LOG_ATTEMPTS,
      sleep,
      dependencies.readRunLog,
      pollIntervalMs
    )
    const outcome = acceptanceOutcome(snapshot, metrics)
    const steps = metrics?.steps ?? snapshot.steps
    const cacheHitRate = metrics?.cacheHitRate ?? null
    const acceptance = evaluateAgentRunAcceptance(options.profile, { outcome, steps, cacheHitRate })

    const result = snapshot.result
    const [psd, preview] = result
      ? await Promise.all([
          download(fetchImplementation, result.psdUrl, 'PSD'),
          download(fetchImplementation, result.previewUrl, 'preview')
        ])
      : [undefined, undefined]
    const harnessError = metrics ? null : `Persisted metrics did not appear for run ${runId}`
    const summary: DeployedRunSummary = {
      label: 'Live run through the deployed Layerhand API: GPT-6 Astra, computer tool, Browserbase, Photopea',
      profile: options.profile.name,
      instruction: options.profile.instruction,
      image: options.filename,
      publicUrl: options.baseUrl,
      runId,
      outcome: metrics?.outcome ?? snapshot.status,
      steps,
      costUsd: snapshot.costUsd,
      tokensIn: snapshot.tokensIn,
      tokensOut: snapshot.tokensOut,
      cacheHitRate,
      failureCode: metrics?.failureCode ?? null,
      browserReleaseEvidence: 'runtime-release-attempt-before-done',
      harnessError,
      acceptance,
      layers: result?.layers ?? null,
      errors: [...snapshot.recoverableErrors, ...(snapshot.failureReason ? [snapshot.failureReason] : [])]
    }
    return { summary, psd, preview, lastFrame: dataPng(snapshot.frameUrl) }
  } catch (error) {
    if (error instanceof DeployedRunError) throw error
    throw new DeployedRunError(error instanceof Error ? error.message : String(error), runId, snapshot)
  }
}

export async function readPersistedRunMetrics(database: SQL, runId: string): Promise<PersistedRunMetrics | null> {
  const rows = await database<
    { outcome: string; steps: number; cache_hit_rate: number | null; failure_code: string | null }[]
  >`
    SELECT outcome, steps, cache_hit_rate, failure_code
    FROM run_log
    WHERE run_id = ${runId}
  `
  const row = rows[0]
  return row
    ? {
        outcome: row.outcome,
        steps: Number(row.steps),
        cacheHitRate: row.cache_hit_rate === null ? null : Number(row.cache_hit_rate),
        failureCode: row.failure_code
      }
    : null
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: { profile: { type: 'string', default: 'cache-acceptance' } }
  })
  const [baseUrlArgument, imageArgument] = positionals
  const baseUrl = baseUrlArgument ?? process.env.PUBLIC_URL
  const databaseUrl = process.env.DATABASE_URL
  if (!baseUrl || !databaseUrl) throw new Error('PUBLIC_URL (or a URL argument) and DATABASE_URL are required')

  const profile = agentRunProfile(values.profile)
  const imagePath = resolve(
    imageArgument ?? new URL('../photopea-round-trip/results/input.jpg', import.meta.url).pathname
  )
  const output = resolve(import.meta.dir, 'output', new Date().toISOString().replaceAll(':', '-'))
  await mkdir(output, { recursive: true })

  const database = new SQL(databaseUrl)
  try {
    try {
      const evidence = await runDeployedAgentAcceptance(
        {
          baseUrl,
          image: new Uint8Array(await readFile(imagePath)),
          filename: basename(imagePath),
          profile
        },
        {
          readRunLog: (runId) => readPersistedRunMetrics(database, runId),
          progress: (snapshot) => console.error(`run ${snapshot.runId}: ${snapshot.status}, step ${snapshot.steps}`)
        }
      )
      await writeFile(resolve(output, 'summary.json'), `${JSON.stringify(evidence.summary, null, 2)}\n`)
      if (evidence.psd) await writeFile(resolve(output, 'result.psd'), evidence.psd)
      if (evidence.preview) await writeFile(resolve(output, 'preview.png'), evidence.preview)
      if (evidence.lastFrame) await writeFile(resolve(output, 'last-frame.png'), evidence.lastFrame)
      console.log(JSON.stringify(evidence.summary, null, 2))
      if (evidence.summary.acceptance && !evidence.summary.acceptance.passed) process.exitCode = 1
    } catch (error) {
      const failure = error instanceof DeployedRunError ? error : new DeployedRunError(String(error), null, null)
      const snapshot = failure.snapshot
      const summary = {
        label: 'Deployed agent acceptance harness failure',
        profile: profile.name,
        instruction: profile.instruction,
        image: basename(imagePath),
        publicUrl: baseUrl,
        runId: failure.runId,
        outcome: 'harness_failed',
        steps: snapshot?.steps ?? 0,
        costUsd: snapshot?.costUsd ?? 0,
        tokensIn: snapshot?.tokensIn ?? 0,
        tokensOut: snapshot?.tokensOut ?? 0,
        cacheHitRate: null,
        failureCode: null,
        browserReleaseEvidence:
          snapshot && snapshot.status !== 'running' ? 'runtime-release-attempt-before-done' : null,
        harnessError: failure.message,
        acceptance: {
          passed: false,
          checks: { complete: false, minimumSteps: false, cacheHitRate: false }
        },
        lastSnapshot: snapshot
          ? {
              status: snapshot.status,
              steps: snapshot.steps,
              cap: snapshot.cap,
              narration: snapshot.narration,
              costUsd: snapshot.costUsd,
              tokensIn: snapshot.tokensIn,
              tokensOut: snapshot.tokensOut,
              lastEventId: snapshot.lastEventId,
              corrections: snapshot.corrections,
              recoverableErrors: snapshot.recoverableErrors,
              failureReason: snapshot.failureReason,
              layers: snapshot.result?.layers ?? null
            }
          : null
      }
      const lastFrame = dataPng(snapshot?.frameUrl ?? null)
      await writeFile(resolve(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
      if (lastFrame) await writeFile(resolve(output, 'last-frame.png'), lastFrame)
      console.error(JSON.stringify(summary, null, 2))
      process.exitCode = 1
    }
  } finally {
    await database.close()
  }
}

if (import.meta.main) await main()
