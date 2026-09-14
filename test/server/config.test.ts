import { describe, expect, test } from 'bun:test'

import { ConfigurationError, readConfig } from '../../src/server/config'

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
