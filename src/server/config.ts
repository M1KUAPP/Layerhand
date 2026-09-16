const REQUIRED_NAMES = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'FREE_DAILY_BUDGET_USD',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'BROWSERBASE_API_KEY',
  'OPENAI_API_KEY',
  'TRUST_PROXY_HOPS'
] as const

type EnvironmentName = (typeof REQUIRED_NAMES)[number]
type Environment = Readonly<Record<string, string | undefined>>

export interface ServerConfig {
  databaseUrl: string
  sessionSecret: string
  freeDailyBudgetUsd: number
  s3: {
    endpoint: string
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
  }
  browserbaseApiKey: string
  openAiApiKey: string
  trustProxyHops: number
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

function requiredEnvironment(env: Environment): Record<EnvironmentName, string> {
  const missing = REQUIRED_NAMES.filter((name) => !env[name])
  if (missing.length > 0) {
    throw new ConfigurationError(`Missing required environment variables: ${missing.join(', ')}`)
  }
  return Object.fromEntries(REQUIRED_NAMES.map((name) => [name, env[name]!])) as Record<EnvironmentName, string>
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

function parsePositiveInteger(name: string, value: string): number {
  const number = Number(value)
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(number)) {
    throw new ConfigurationError(`${name} must be a positive integer`)
  }
  return number
}

export interface RunLimits {
  /** Model calls one run may make (FR-12). */
  stepCap: number
  /** What one run may spend, and what a free run reserves from the daily ceiling (NFR-2, FR-37). */
  freeRunSpendCapUsd: number
}

// The live agent run needed 19 steps, so 40 leaves room; $3 is several times its $0.85.
export const DEFAULT_RUN_LIMITS: RunLimits = { stepCap: 40, freeRunSpendCapUsd: 3 }

/** The run limits, in every environment. Each is optional and has a default. */
export function readRunLimits(env: Environment): RunLimits {
  return {
    stepCap:
      env.RUN_STEP_CAP === undefined
        ? DEFAULT_RUN_LIMITS.stepCap
        : parsePositiveInteger('RUN_STEP_CAP', env.RUN_STEP_CAP),
    freeRunSpendCapUsd:
      env.FREE_RUN_SPEND_CAP_USD === undefined
        ? DEFAULT_RUN_LIMITS.freeRunSpendCapUsd
        : parsePositiveDecimal('FREE_RUN_SPEND_CAP_USD', env.FREE_RUN_SPEND_CAP_USD)
  }
}

/**
 * How a correction reaches the model (#9). `boundary`, the default, sends it
 * with the next call. `native` also steers the response in flight over a
 * WebSocket, and stays off until a live run has proved it.
 */
export type Steering = 'native' | 'boundary'

export function readSteering(env: Environment): Steering {
  if (env.STEERING === undefined || env.STEERING === 'boundary') return 'boundary'
  if (env.STEERING === 'native') return 'native'
  throw new ConfigurationError('STEERING must be native or boundary')
}

/** Refuses new runs and upload warming while set to `1`, for a launch-day emergency (#118). */
export function readRunsPaused(env: Environment): boolean {
  if (env.RUNS_PAUSED === undefined || env.RUNS_PAUSED === '') return false
  if (env.RUNS_PAUSED === '1') return true
  if (env.RUNS_PAUSED === '0') return false
  throw new ConfigurationError('RUNS_PAUSED must be 1 or 0')
}

function parseTrustedProxyHops(value: string): number {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new ConfigurationError('TRUST_PROXY_HOPS must be a non-negative integer')
  }
  const hops = Number(value)
  if (!Number.isSafeInteger(hops)) {
    throw new ConfigurationError('TRUST_PROXY_HOPS must be a non-negative integer')
  }
  return hops
}

function validateStorageEndpoint(value: string): string {
  try {
    const endpoint = new URL(value)
    if (endpoint.protocol === 'http:' || endpoint.protocol === 'https:') return value
  } catch {
    // The stable configuration error below intentionally omits the supplied value.
  }
  throw new ConfigurationError('S3_ENDPOINT must use HTTP or HTTPS')
}

export function readConfig(env: Environment): ServerConfig {
  const value = requiredEnvironment(env)
  return {
    databaseUrl: value.DATABASE_URL,
    sessionSecret: value.SESSION_SECRET,
    freeDailyBudgetUsd: parsePositiveDecimal('FREE_DAILY_BUDGET_USD', value.FREE_DAILY_BUDGET_USD),
    s3: {
      endpoint: validateStorageEndpoint(value.S3_ENDPOINT),
      region: value.S3_REGION,
      bucket: value.S3_BUCKET,
      accessKeyId: value.S3_ACCESS_KEY_ID,
      secretAccessKey: value.S3_SECRET_ACCESS_KEY
    },
    browserbaseApiKey: value.BROWSERBASE_API_KEY,
    openAiApiKey: value.OPENAI_API_KEY,
    trustProxyHops: parseTrustedProxyHops(value.TRUST_PROXY_HOPS)
  }
}
