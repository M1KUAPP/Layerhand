import { describe, expect, test } from 'bun:test'

import { ConfigurationError, readConfig, readRunLimits, readRunsPaused, readSteering } from '../../src/server/config'

const VALID_ENV = {
  DATABASE_URL: 'postgres://layerhand:password@database.internal/layerhand',
  SESSION_SECRET: 'session-secret-value',
  FREE_DAILY_BUDGET_USD: '175.50',
  S3_ENDPOINT: 'https://storage.example.com',
  S3_REGION: 'auto',
  S3_BUCKET: 'layerhand-artifacts',
  S3_ACCESS_KEY_ID: 'access-key-value',
  S3_SECRET_ACCESS_KEY: 'secret-key-value',
  BROWSERBASE_API_KEY: 'browserbase-key-value',
  OPENAI_API_KEY: 'openai-key-value',
  TRUST_PROXY_HOPS: '1'
} as const

describe('readConfig', () => {
  test('parses every production setting with typed numeric values', () => {
    expect(readConfig(VALID_ENV)).toEqual({
      databaseUrl: VALID_ENV.DATABASE_URL,
      sessionSecret: VALID_ENV.SESSION_SECRET,
      freeDailyBudgetUsd: 175.5,
      s3: {
        endpoint: VALID_ENV.S3_ENDPOINT,
        region: VALID_ENV.S3_REGION,
        bucket: VALID_ENV.S3_BUCKET,
        accessKeyId: VALID_ENV.S3_ACCESS_KEY_ID,
        secretAccessKey: VALID_ENV.S3_SECRET_ACCESS_KEY
      },
      browserbaseApiKey: VALID_ENV.BROWSERBASE_API_KEY,
      openAiApiKey: VALID_ENV.OPENAI_API_KEY,
      trustProxyHops: 1
    })
  })

  test('names all missing variables without printing any present value', () => {
    let error: unknown
    try {
      readConfig({ DATABASE_URL: VALID_ENV.DATABASE_URL })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(ConfigurationError)
    expect(String(error)).toContain('SESSION_SECRET')
    expect(String(error)).toContain('FREE_DAILY_BUDGET_USD')
    expect(String(error)).toContain('TRUST_PROXY_HOPS')
    expect(String(error)).not.toContain(VALID_ENV.DATABASE_URL)
  })

  test.each(['0', '-1', 'NaN', 'Infinity', ' 5'])(
    'rejects invalid FREE_DAILY_BUDGET_USD %s without echoing it',
    (value) => {
      expect(() => readConfig({ ...VALID_ENV, FREE_DAILY_BUDGET_USD: value })).toThrow(
        'FREE_DAILY_BUDGET_USD must be a positive decimal number'
      )
    }
  )

  test.each(['-1', '1.5', 'NaN', ' 1', '1 '])('rejects invalid TRUST_PROXY_HOPS %s without echoing it', (value) => {
    expect(() => readConfig({ ...VALID_ENV, TRUST_PROXY_HOPS: value })).toThrow(
      'TRUST_PROXY_HOPS must be a non-negative integer'
    )
  })

  test('accepts zero trusted proxy hops', () => {
    expect(readConfig({ ...VALID_ENV, TRUST_PROXY_HOPS: '0' }).trustProxyHops).toBe(0)
  })

  test('rejects a non-HTTP object storage endpoint without echoing it', () => {
    const endpoint = 'file:///secret/provider/path'
    let error: unknown
    try {
      readConfig({ ...VALID_ENV, S3_ENDPOINT: endpoint })
    } catch (caught) {
      error = caught
    }

    expect(String(error)).toContain('S3_ENDPOINT must use HTTP or HTTPS')
    expect(String(error)).not.toContain(endpoint)
  })
})

describe('readRunLimits', () => {
  test('defaults to 40 steps, a $3 spend cap, and twenty runs at once', () => {
    expect(readRunLimits({})).toEqual({ stepCap: 40, freeRunSpendCapUsd: 3, maxConcurrentRuns: 20 })
  })

  test('reads every limit from the environment', () => {
    expect(readRunLimits({ RUN_STEP_CAP: '25', FREE_RUN_SPEND_CAP_USD: '2.50', MAX_CONCURRENT_RUNS: '12' })).toEqual({
      stepCap: 25,
      freeRunSpendCapUsd: 2.5,
      maxConcurrentRuns: 12
    })
  })

  test.each(['0', '-1', '1.5', 'NaN', ' 5'])('rejects invalid MAX_CONCURRENT_RUNS %s without echoing it', (value) => {
    expect(() => readRunLimits({ MAX_CONCURRENT_RUNS: value })).toThrow(
      'MAX_CONCURRENT_RUNS must be a positive integer'
    )
  })

  test.each(['0', '-1', '1.5', 'NaN', ' 5', '99999999999999999999'])(
    'rejects invalid RUN_STEP_CAP %s without echoing it',
    (value) => {
      expect(() => readRunLimits({ RUN_STEP_CAP: value })).toThrow('RUN_STEP_CAP must be a positive integer')
    }
  )

  test.each(['0', '-1', 'NaN', 'Infinity', ' 5'])(
    'rejects invalid FREE_RUN_SPEND_CAP_USD %s without echoing it',
    (value) => {
      expect(() => readRunLimits({ FREE_RUN_SPEND_CAP_USD: value })).toThrow(
        'FREE_RUN_SPEND_CAP_USD must be a positive decimal number'
      )
    }
  )
})

describe('readSteering', () => {
  test('stays at the step boundary unless native steering is asked for', () => {
    expect(readSteering({})).toBe('boundary')
    expect(readSteering({ STEERING: 'boundary' })).toBe('boundary')
    expect(readSteering({ STEERING: 'native' })).toBe('native')
  })

  test.each(['', 'Native', 'websocket'])('rejects STEERING %p without echoing it', (value) => {
    expect(() => readSteering({ STEERING: value })).toThrow('STEERING must be native or boundary')
  })
})

describe('readRunsPaused', () => {
  test('stays unpaused when unset, empty, or explicitly 0', () => {
    expect(readRunsPaused({})).toBe(false)
    expect(readRunsPaused({ RUNS_PAUSED: '' })).toBe(false)
    expect(readRunsPaused({ RUNS_PAUSED: '0' })).toBe(false)
  })

  test('pauses when set to 1', () => {
    expect(readRunsPaused({ RUNS_PAUSED: '1' })).toBe(true)
  })

  test.each(['true', 'yes', ' 1', '1 ', '01', 'TRUE'])('rejects RUNS_PAUSED %p without echoing it', (value) => {
    expect(() => readRunsPaused({ RUNS_PAUSED: value })).toThrow('RUNS_PAUSED must be 1 or 0')
  })
})
