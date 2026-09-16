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

  test('prices the next call as if it missed the cache and grew as much as the last one did', () => {
    const spend = new Spend({ usdPerInputToken: 0.01, usdPerCachedInputToken: 0.001, usdPerOutputToken: 0.1 })
    expect(spend.wouldPass(0)).toBe(false)
    spend.add({ inputTokens: 100, cachedInputTokens: 0, outputTokens: 10 })
    spend.add({ inputTokens: 130, cachedInputTokens: 100, outputTokens: 10 })
    // $2, then $1.40, spent. The next call is taken to send 160 tokens, none of
    // them cached, and to write 10: $2.60.
    expect(spend.wouldPass(6.01)).toBe(false)
    expect(spend.wouldPass(5.99)).toBe(true)
  })

  test('estimates the next call from the response the last call ended on, but bills every response', () => {
    const spend = new Spend({ usdPerInputToken: 0.01, usdPerCachedInputToken: 0.001, usdPerOutputToken: 0.1 })
    spend.add({ inputTokens: 100, cachedInputTokens: 0, outputTokens: 10 })
    // A steered call: the response steered away, then the one that answered.
    spend.add(
      { inputTokens: 230, cachedInputTokens: 0, outputTokens: 15 },
      { inputTokens: 120, cachedInputTokens: 0, outputTokens: 10 }
    )
    // $2, then $3.80, spent. The next call continues from the answer alone, so
    // it is taken to send 140 tokens, none of them cached, and to write 10: $2.40.
    expect(spend.usd).toBeCloseTo(5.8, 9)
    expect(spend.tokensIn).toBe(330)
    expect(spend.tokensOut).toBe(25)
    expect(spend.wouldPass(8.21)).toBe(false)
    expect(spend.wouldPass(8.19)).toBe(true)
  })

  test('lets a run reach its cap exactly, but not pass it', () => {
    const spend = new Spend({ usdPerInputToken: 1, usdPerCachedInputToken: 0, usdPerOutputToken: 0 })
    spend.add({ inputTokens: 10, cachedInputTokens: 0, outputTokens: 0 })
    // $10 spent, and the next call is estimated at another $10.
    expect(spend.wouldPass(20)).toBe(false)
    expect(spend.wouldPass(19)).toBe(true)
  })

  test('does not expect the next call to shrink when the last one did', () => {
    const spend = new Spend({ usdPerInputToken: 0.01, usdPerCachedInputToken: 0, usdPerOutputToken: 0 })
    spend.add({ inputTokens: 100, cachedInputTokens: 0, outputTokens: 0 })
    spend.add({ inputTokens: 80, cachedInputTokens: 0, outputTokens: 0 })
    // $1.80 spent, and the next call is taken to send the last call's 80 tokens.
    expect(spend.wouldPass(2.61)).toBe(false)
    expect(spend.wouldPass(2.59)).toBe(true)
  })
})
