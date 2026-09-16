import { describe, expect, test } from 'bun:test'
import { retryAfterMs, retryWaitMs, sleep } from './retry'

const RETRIES = [0, 1, 2, 3, 4, 5]

describe('retryWaitMs', () => {
  test('doubles from one second up to thirty, with half of each wait jittered', () => {
    expect(RETRIES.map((retries) => retryWaitMs(retries, undefined, 1))).toEqual([
      1_000, 2_000, 4_000, 8_000, 16_000, 30_000
    ])
    expect(RETRIES.map((retries) => retryWaitMs(retries, undefined, 0))).toEqual([
      500, 1_000, 2_000, 4_000, 8_000, 15_000
    ])
  })

  test('waits at least as long as the server asked, with the jitter on top, so runs told the same wait come back apart', () => {
    expect(retryWaitMs(0, 3_000, 0)).toBe(3_000)
    expect(retryWaitMs(0, 3_000, 1)).toBe(3_500)
    expect(retryWaitMs(4, 3_000, 1)).toBe(16_000)
  })

  test('never waits longer than thirty seconds, jitter included', () => {
    expect(retryWaitMs(0, 29_800, 1)).toBe(30_000)
    expect(retryWaitMs(5, 30_000, 1)).toBe(30_000)
  })

  test('gives up after six retries, or when the server asks for a longer wait than any retry makes', () => {
    expect(retryWaitMs(6, undefined, 0.5)).toBeUndefined()
    expect(retryWaitMs(0, 30_000, 0.5)).toBe(30_000)
    expect(retryWaitMs(0, 30_001, 0.5)).toBeUndefined()
  })
})

describe('retryAfterMs', () => {
  const now = Date.parse('2026-09-16T12:00:00Z')

  test('reads a wait in seconds, or until an HTTP date', () => {
    expect(retryAfterMs('3', now)).toBe(3_000)
    expect(retryAfterMs('0', now)).toBe(0)
    expect(retryAfterMs('Wed, 16 Sep 2026 12:00:05 GMT', now)).toBe(5_000)
    expect(retryAfterMs('Wed, 16 Sep 2026 11:59:00 GMT', now)).toBe(0)
  })

  test('ignores a header that is absent or unreadable', () => {
    expect(retryAfterMs(null, now)).toBeUndefined()
    expect(retryAfterMs('', now)).toBeUndefined()
    expect(retryAfterMs('soon', now)).toBeUndefined()
  })
})

describe('sleep', () => {
  test('resolves once the wait is over', async () => {
    const startedAt = performance.now()
    await sleep(20, new AbortController().signal)
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(15)
  })

  test('rejects with the reason once the signal aborts', async () => {
    const aborter = new AbortController()
    const waiting = sleep(60_000, aborter.signal)
    aborter.abort(new Error('cancelled'))
    await expect(waiting).rejects.toThrow('cancelled')
  })

  test('rejects at once when the signal has already aborted', async () => {
    const aborter = new AbortController()
    aborter.abort(new Error('cancelled'))
    await expect(sleep(60_000, aborter.signal)).rejects.toThrow('cancelled')
  })
})
