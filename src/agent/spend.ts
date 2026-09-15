// What a run has spent on the model so far, priced from the usage each
// response reports (NFR-2, FR-15).
import type { TokenUsage } from './model'

export interface TokenPricing {
  usdPerInputToken: number
  usdPerCachedInputToken: number
  usdPerOutputToken: number
}

// docs/TRD.md § Where the money goes. Uncached input is priced as a cache
// write, at $12.50 per million rather than the $10 of plain input, so spend
// errs high.
export const ASTRA_PRICING: TokenPricing = {
  usdPerInputToken: 12.5 / 1_000_000,
  usdPerCachedInputToken: 1 / 1_000_000,
  usdPerOutputToken: 50 / 1_000_000
}

export class Spend {
  readonly #pricing: TokenPricing
  #usd = 0
  #tokensIn = 0
  #tokensOut = 0

  constructor(pricing: TokenPricing = ASTRA_PRICING) {
    this.#pricing = pricing
  }

  get usd(): number {
    return this.#usd
  }

  get tokensIn(): number {
    return this.#tokensIn
  }

  get tokensOut(): number {
    return this.#tokensOut
  }

  /** Adds one model call to the run's totals. */
  add(usage: TokenUsage): void {
    const uncached = usage.inputTokens - usage.cachedInputTokens
    this.#usd +=
      uncached * this.#pricing.usdPerInputToken +
      usage.cachedInputTokens * this.#pricing.usdPerCachedInputToken +
      usage.outputTokens * this.#pricing.usdPerOutputToken
    this.#tokensIn += usage.inputTokens
    this.#tokensOut += usage.outputTokens
  }
}
