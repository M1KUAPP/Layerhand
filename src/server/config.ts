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

function parseBudget(value: string): number {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new ConfigurationError('FREE_DAILY_BUDGET_USD must be a positive decimal number')
  }
  const budget = Number(value)
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new ConfigurationError('FREE_DAILY_BUDGET_USD must be a positive decimal number')
  }
  return budget
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
    freeDailyBudgetUsd: parseBudget(value.FREE_DAILY_BUDGET_USD),
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
