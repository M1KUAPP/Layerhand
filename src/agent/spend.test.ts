import { describe, expect, test } from 'bun:test'
import { Spend } from './spend'

describe('Spend', () => {
  test('prices uncached input as a cache write, cached input as a cache read, and output', () => {
    const spend = new Spend()
    spend.add({ inputTokens: 1_000_000, cachedInputTokens: 400_000, outputTokens: 10_000 })
    // 600,000 tokens written at $12.50 per million, 400,000 read at $1, and
    // 10,000 out at $50.
    expect(spend.usd).toBeCloseTo(8.4, 9)
    expect(spend.tokensIn).toBe(1_000_000)
    expect(spend.tokensOut).toBe(10_000)
  })

  test('keeps running totals across calls', () => {
    const spend = new Spend({ usdPerInputToken: 0.01, usdPerCachedInputToken: 0.001, usdPerOutputToken: 0.1 })
    spend.add({ inputTokens: 100, cachedInputTokens: 0, outputTokens: 10 })
    spend.add({ inputTokens: 200, cachedInputTokens: 100, outputTokens: 20 })
    // $1 + $1 for the first call, then $1 + $0.10 + $2 for the second.
    expect(spend.usd).toBeCloseTo(5.1, 9)
    expect(spend.tokensIn).toBe(300)
    expect(spend.tokensOut).toBe(30)
  })
})
