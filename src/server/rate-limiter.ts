// An in-memory fixed-window request counter (#115). Production runs one
// instance, so counting here is enough: a second instance would keep its
// own counts, which is an accepted limit of counting in memory rather than
// in a shared store.

/** How many `allow()` calls pass between sweeps of expired windows. */
const SWEEP_INTERVAL = 1_000

export interface RateLimiterOptions {
  /** The window's length, in milliseconds. */
  windowMs: number
  /** Requests a key may make inside one window. */
  max: number
  now?: () => number
}

export class RateLimiter {
  readonly #windowMs: number
  readonly #max: number
  readonly #now: () => number
  readonly #hits = new Map<string, { count: number; resetAt: number }>()
  #callsSinceSweep = 0

  constructor(options: RateLimiterOptions) {
    this.#windowMs = options.windowMs
    this.#max = options.max
    this.#now = options.now ?? (() => Date.now())
  }

  /** How many keys this is currently counting, for tests. */
  get size(): number {
    return this.#hits.size
  }

  /** True while `key` is still inside its limit for the current window. */
  allow(key: string): boolean {
    const now = this.#now()
    this.#sweep(now)
    const hit = this.#hits.get(key)
    if (!hit || hit.resetAt <= now) {
      this.#hits.set(key, { count: 1, resetAt: now + this.#windowMs })
      return true
    }
    if (hit.count >= this.#max) return false
    hit.count += 1
    return true
  }

  /**
   * Forgets expired windows periodically, so a stream of one-off keys —
   * every visitor cookie a client bothers to mint, say — cannot grow this
   * without bound between the requests that would otherwise notice they
   * have expired.
   */
  #sweep(now: number): void {
    this.#callsSinceSweep += 1
    if (this.#callsSinceSweep < SWEEP_INTERVAL) return
    this.#callsSinceSweep = 0
    for (const [key, hit] of this.#hits) {
      if (hit.resetAt <= now) this.#hits.delete(key)
    }
  }
}
