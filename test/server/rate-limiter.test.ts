// An in-memory fixed-window request counter (#115). Production runs one
// instance, so counting here is enough to blunt automated traffic without a
// shared store.
import { describe, expect, test } from 'bun:test'

import { RateLimiter } from '../../src/server/rate-limiter'

describe('RateLimiter', () => {
  test('allows up to the limit inside one window, then refuses', () => {
    let now = 0
    const limiter = new RateLimiter({ windowMs: 1_000, max: 3, now: () => now })

    const results = [limiter.allow('a'), limiter.allow('a'), limiter.allow('a'), limiter.allow('a')]

    expect(results).toEqual([true, true, true, false])
  })

  test('tracks each key independently', () => {
    let now = 0
    const limiter = new RateLimiter({ windowMs: 1_000, max: 1, now: () => now })

    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('b')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
    expect(limiter.allow('b')).toBe(false)
  })

  test('resets a key once its window has passed', () => {
    let now = 0
    const limiter = new RateLimiter({ windowMs: 1_000, max: 1, now: () => now })

    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
    now = 1_000
    expect(limiter.allow('a')).toBe(true)
  })

  test('gives each key its own window, starting from its own first request', () => {
    let now = 0
    const limiter = new RateLimiter({ windowMs: 1_000, max: 1, now: () => now })

    expect(limiter.allow('a')).toBe(true)
    now = 500
    expect(limiter.allow('b')).toBe(true)
    now = 999
    // Key a's window opened at 0 and closes at 1000; key b's opened at 500.
    expect(limiter.allow('a')).toBe(false)
    expect(limiter.allow('b')).toBe(false)
    now = 1_500
    expect(limiter.allow('b')).toBe(true)
  })

  test('forgets expired windows so a stream of one-off keys does not grow without bound', () => {
    let now = 0
    const limiter = new RateLimiter({ windowMs: 1_000, max: 1, now: () => now })

    for (let i = 0; i < 5_000; i += 1) {
      limiter.allow(`one-off-${i}`)
      now += 1_000
    }

    expect(limiter.size).toBeLessThan(5_000)
  })
})
