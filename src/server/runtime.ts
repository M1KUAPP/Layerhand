import type { RunEvent, RunHandle, RunRequest } from '../agent/contract'
import { fakeRun } from '../agent/fake-run'
import { ScriptedModel } from '../agent/scripted-model'
import { createRecordedFakeEditorSession } from '../editor/fake-editor-session'
import { artifactPublisher, managedAgentRun } from './agent-run'
import type { ArtifactStore } from './artifact-store'
import { MemoryArtifactStore } from './artifact-store'
import { createApplication, type Application } from './application'
import { ConfigurationError, readConfig } from './config'
import { createDatabase, databaseReady } from './database'
import type { ManagedRun, RunStopReason } from './managed-run'
import { SqlMeterStore, usdToMicroUsd } from './meter-store'
import { applyMigrations } from './migrations'
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
  registryOptions?: Omit<RunRegistryOptions, 'onTerminal'>
  /** Receives one NDJSON record per finished run. Defaults to standard output. */
  writeRunLog?: (record: string) => void
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

  const handle: RunHandle = {
    events: {
      async *[Symbol.asyncIterator](): AsyncIterator<RunEvent> {
        for await (const event of underlying.events) {
          if (event.type === 'error' && !event.recoverable) stopReason = 'failed'
          if (event.type === 'done') {
            stopReason = cancelled ? 'cancelled' : event.result.complete ? 'complete' : 'step_cap'
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
    }
  }
}

type RunMode = 'agent' | 'fake'

// Agent mode runs the loop against the recorded editor and a scripted model,
// because nothing wires in a real model or editor yet. The default is fakeRun().
function readRunMode(value: string | undefined): RunMode {
  if (value === undefined || value === 'fake') return 'fake'
  if (value === 'agent') return 'agent'
  throw new ConfigurationError('RUN_MODE must be agent or fake')
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
      ...options.registryOptions,
      onTerminal: createRunLogger({
        write: options.writeRunLog ?? ((record) => process.stdout.write(record)),
        store: new SqlRunLogStore(database)
      })
    })
    const routes = new RunRoutes({
      registry,
      meterStore: new SqlMeterStore(database, usdToMicroUsd(dailyBudgetUsd)),
      artifactStore,
      waitlistStore: new SqlWaitlistStore(database),
      sessionSecret: config?.sessionSecret ?? env.SESSION_SECRET ?? 'layerhand-development-session-secret',
      trustProxyHops: config?.trustProxyHops ?? 0,
      freeRunReservationMicroUsd: usdToMicroUsd(8),
      clientAddress: options.clientAddress,
      now: () => new Date(),
      idGenerator: () => crypto.randomUUID(),
      runFactory:
        runMode === 'agent'
          ? async (request) => {
              if (!request.apiKey && serverApiKey) request.apiKey = serverApiKey
              return managedAgentRun(request, {
                session: await createRecordedFakeEditorSession(),
                model: new ScriptedModel({ delayMs: intervalMs }),
                publish
              })
            }
          : (request) => managedFakeRun(request, intervalMs, serverApiKey),
      stepCap: options.stepCap ?? 15
    })
    return {
      application: createApplication({
        databaseReady: () => databaseReady(database),
        routes
      }),
      registry,
      close: () => database.close()
    }
  } catch (error) {
    await database.close().catch(() => undefined)
    throw error
  }
}
