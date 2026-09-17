import type { RunEvent, RunHandle, RunRequest } from '../agent/contract'
import { fakeRun } from '../agent/fake-run'
import { ScriptedModel } from '../agent/scripted-model'
import { createRecordedFakeEditorSession } from '../editor/fake-editor-session'
import { artifactPublisher, liveAgentRun, managedAgentRun } from './agent-run'
import { browserbaseEditorSession } from './browserbase-editor-session'
import { WarmSessionPool } from './warm-session-pool'
import type { ArtifactStore } from './artifact-store'
import { MemoryArtifactStore } from './artifact-store'
import { createApplication, type Application } from './application'
import { BrowserbaseClient } from './browserbase-client'
import {
  ConfigurationError,
  readConfig,
  readRunLimits,
  readRunsPaused,
  readSteering,
  type ServerConfig,
  type Steering
} from './config'
import { createDatabase, databaseReady } from './database'
import type { ManagedRun, RunStopReason } from './managed-run'
import { SqlMeterStore, usdToMicroUsd } from './meter-store'
import { applyMigrations } from './migrations'
import { checkOpenAiKey } from './openai-key'
import { RunRegistry, type RunRegistryOptions } from './run-registry'
import { createRunLogger, SqlRunLogStore } from './run-log'
import { RunRoutes } from './run-routes'
import { createS3Bucket, S3ArtifactStore } from './s3-artifact-store'
import { SqlWaitlistStore } from './waitlist-store'

type Environment = Readonly<Record<string, string | undefined>>

export interface LaunchRuntimeOptions {
  env?: Environment
  clientAddress(request: Request): string
  fakeRunIntervalMs?: number
  stepCap?: number
  artifactStore?: ArtifactStore
  /** Editors warmed for uploads. Agent mode warms them on Browserbase unless given. */
  warmSessions?: WarmSessionPool
  registryOptions?: Omit<RunRegistryOptions, 'onTerminal'>
  /** Receives one NDJSON record per finished run. Defaults to standard output. */
  writeRunLog?: (record: string) => void
  /** Receives one NDJSON record per failed run, with its redacted cause. Defaults to standard error. */
  writeRunFailure?: (record: string) => void
  /** Checks a user's own key in agent mode. The real OpenAI unless given. */
  openAiFetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

export interface LaunchRuntime {
  application: Application
  registry: RunRegistry
  close(): Promise<void>
}

function managedFakeRun(request: RunRequest, intervalMs: number, serverApiKey?: string): ManagedRun {
  if (!request.apiKey && serverApiKey) request.apiKey = serverApiKey
  const underlying = fakeRun(request, { intervalMs })
  let stopReason: RunStopReason = 'complete'
  let cancelled = false
  let shuttingDown = false

  const handle: RunHandle = {
    events: {
      async *[Symbol.asyncIterator](): AsyncIterator<RunEvent> {
        for await (const event of underlying.events) {
          if (event.type === 'error' && !event.recoverable) stopReason = 'failed'
          if (event.type === 'done') {
            stopReason = shuttingDown
              ? 'shutdown'
              : cancelled
                ? 'cancelled'
                : event.result.complete
                  ? 'complete'
                  : 'step_cap'
            yield { ...event, result: { ...event.result, stopReason } }
            continue
          }
          yield event
        }
      }
    },
    steer: (text) => underlying.steer(text),
    async cancel() {
      cancelled = true
      stopReason = 'cancelled'
      await underlying.cancel()
    }
  }

  return {
    handle,
    metrics: () => ({ cacheHitRate: null, stopReason }),
    releaseSecrets() {
      request.apiKey = undefined
    },
    async shutdown() {
      shuttingDown = true
      stopReason = 'shutdown'
      await underlying.cancel()
    }
  }
}

type RunMode = 'agent' | 'scripted' | 'fake'

// Agent mode runs the real agent. Scripted mode runs the loop against the
// recorded editor and a scripted model, so the loop can be worked on without
// a key or a browser. The default is fakeRun().
function readRunMode(value: string | undefined): RunMode {
  if (value === undefined || value === 'fake') return 'fake'
  if (value === 'agent' || value === 'scripted') return value
  throw new ConfigurationError('RUN_MODE must be agent, scripted, or fake')
}

interface AgentConfig {
  hostUrl: string
  sessions: BrowserbaseClient
  steering: Steering
}

// Browserbase's browser loads the Photopea host page from this service, so
// agent mode needs the public address the service is reached at.
function readAgentConfig(env: Environment, config: ServerConfig | undefined): AgentConfig {
  const browserbaseApiKey = config?.browserbaseApiKey ?? env.BROWSERBASE_API_KEY
  if (!browserbaseApiKey) throw new ConfigurationError('RUN_MODE=agent needs BROWSERBASE_API_KEY')
  if (!env.PUBLIC_URL) throw new ConfigurationError('RUN_MODE=agent needs PUBLIC_URL')
  return {
    hostUrl: photopeaHostUrl(env.PUBLIC_URL),
    sessions: new BrowserbaseClient(browserbaseApiKey),
    steering: readSteering(env)
  }
}

/**
 * The origin PUBLIC_URL names, when it is set and parses. Behind a
 * TLS-terminating proxy like Cloud Run, Bun sees the request's own URL as
 * http://, while a browser's `Origin` header on the deployed page is
 * https://, so the origin check compares against this rather than the
 * request's own URL whenever it is known (#115).
 */
function publicOrigin(publicUrl: string | undefined): string | undefined {
  if (!publicUrl) return undefined
  try {
    return new URL(publicUrl).origin
  } catch {
    return undefined
  }
}

/**
 * The host page's address under PUBLIC_URL. Any user name or password in
 * PUBLIC_URL is dropped, because the address is handed to Browserbase's
 * browser.
 */
export function photopeaHostUrl(publicUrl: string): string {
  let hostUrl: URL | undefined
  try {
    hostUrl = new URL('/photopea-host', publicUrl)
  } catch {
    // Reported below without repeating the value.
  }
  if (hostUrl?.protocol !== 'https:' && hostUrl?.protocol !== 'http:') {
    throw new ConfigurationError('PUBLIC_URL must be an HTTP or HTTPS address')
  }
  hostUrl.username = ''
  hostUrl.password = ''
  return hostUrl.href
}

function developmentNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function createLaunchRuntime(options: LaunchRuntimeOptions): Promise<LaunchRuntime> {
  const env = options.env ?? process.env
  const production = env.NODE_ENV === 'production'
  const runMode = readRunMode(env.RUN_MODE)
  const config = production ? readConfig(env) : undefined
  const limits = readRunLimits(env)
  const runsPaused = readRunsPaused(env)
  const origin = publicOrigin(env.PUBLIC_URL)
  const agent = runMode === 'agent' ? readAgentConfig(env, config) : undefined
  const database = createDatabase(config?.databaseUrl ?? env.DATABASE_URL ?? ':memory:')

  try {
    await applyMigrations(database)
    const artifactStore =
      options.artifactStore ??
      (config ? new S3ArtifactStore(createS3Bucket(config.s3)) : new MemoryArtifactStore(() => crypto.randomUUID()))
    const intervalMs = options.fakeRunIntervalMs ?? developmentNumber(env.FAKE_RUN_INTERVAL_MS, 1_000)
    const serverApiKey = config?.openAiApiKey ?? env.OPENAI_API_KEY
    const publish = artifactPublisher(artifactStore)
    const dailyBudgetUsd = config?.freeDailyBudgetUsd ?? developmentNumber(env.FREE_DAILY_BUDGET_USD, 1_000)
    const registry = new RunRegistry({
      maxConcurrentRuns: limits.maxConcurrentRuns,
      ...options.registryOptions,
      onTerminal: createRunLogger({
        write: options.writeRunLog ?? ((record) => process.stdout.write(record)),
        writeFailure: options.writeRunFailure ?? ((record) => process.stderr.write(record)),
        store: new SqlRunLogStore(database)
      })
    })
    // Only agent mode has a browser to warm: the other modes start instantly (#70).
    const warmSessions =
      options.warmSessions ??
      (agent
        ? new WarmSessionPool({
            create: () =>
              browserbaseEditorSession({ id: crypto.randomUUID(), hostUrl: agent.hostUrl, sessions: agent.sessions })
          })
        : undefined)
    const routes = new RunRoutes({
      registry,
      ...(warmSessions ? { warmSessions } : {}),
      // Only agent mode opens a browser for a run, so only it checks the key first.
      ...(agent ? { checkApiKey: (apiKey: string) => checkOpenAiKey(apiKey, options.openAiFetch) } : {}),
      meterStore: new SqlMeterStore(database, usdToMicroUsd(dailyBudgetUsd)),
      artifactStore,
      waitlistStore: new SqlWaitlistStore(database),
      sessionSecret: config?.sessionSecret ?? env.SESSION_SECRET ?? 'layerhand-development-session-secret',
      trustProxyHops: config?.trustProxyHops ?? 0,
      ...(origin ? { publicOrigin: origin } : {}),
      // A free run reserves the most it may spend (NFR-2), so the ceiling never undercounts it.
      freeRunReservationMicroUsd: usdToMicroUsd(limits.freeRunSpendCapUsd),
      clientAddress: options.clientAddress,
      now: () => new Date(),
      idGenerator: () => crypto.randomUUID(),
      runFactory: agent
        ? (request, warmSession) =>
            liveAgentRun(request, { ...agent, publish, serverApiKey, ...(warmSession ? { session: warmSession } : {}) })
        : runMode === 'scripted'
          ? async (request) => {
              if (!request.apiKey && serverApiKey) request.apiKey = serverApiKey
              return managedAgentRun(request, {
                session: await createRecordedFakeEditorSession(),
                model: new ScriptedModel({ delayMs: intervalMs }),
                publish
              })
            }
          : (request) => managedFakeRun(request, intervalMs, serverApiKey),
      stepCap: options.stepCap ?? limits.stepCap,
      runsPaused
    })
    return {
      application: createApplication({
        databaseReady: () => databaseReady(database),
        routes
      }),
      registry,
      // Runs in flight end first, so their results and run log lines still
      // reach the database. Warm sessions belong to nobody's run, so they are
      // released alongside rather than before: each release can wait ten
      // seconds on Browserbase, and the runs have to end inside Cloud Run's ten.
      async close() {
        const releasingWarmSessions = warmSessions?.close()
        await registry.close()
        await database.close()
        await releasingWarmSessions
      }
    }
  } catch (error) {
    await database.close().catch(() => undefined)
    throw error
  }
}
