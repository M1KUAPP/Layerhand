// A stand-in for GPT-6 Astra until the Responses API adapter exists. It plays
// a fixed retouch, one step per call, and spends a step on each correction it
// is sent, so a correction visibly changes what the run does next (FR-20).
import type { ComputerAction } from '../editor/session'
import type { AgentModel, ModelTurn, Observation, TokenUsage } from './model'

const SCRIPT = [
  'Selecting the product',
  'Masking out the background',
  'Warming the highlights with a curves layer',
  'Painting out the reflections'
]

const CLICK: ComputerAction = { type: 'click', button: 'left', x: 720, y: 450 }

// The TRD's cost model, as fakeRun() uses it: each call resends one more
// 1440x900 frame of about 1,570 tokens, and writes about 750 tokens.
const FRAME_TOKENS = 1_570
const OUTPUT_TOKENS = 750

export interface ScriptedModelOptions {
  /** Milliseconds each call takes, as a real model call would. */
  delayMs?: number
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true }
    )
  })
}

export class ScriptedModel implements AgentModel {
  readonly #delayMs: number
  readonly #corrections: string[] = []
  #calls = 0
  #scripted = 0

  constructor({ delayMs = 1000 }: ScriptedModelOptions = {}) {
    this.#delayMs = delayMs
  }

  async next({ corrections }: Observation, signal: AbortSignal): Promise<ModelTurn> {
    this.#corrections.push(...corrections)
    await wait(this.#delayMs, signal)
    this.#calls += 1
    const inputTokens = FRAME_TOKENS * this.#calls
    const usage: TokenUsage = {
      inputTokens,
      cachedInputTokens: inputTokens - FRAME_TOKENS,
      outputTokens: OUTPUT_TOKENS
    }

    // One correction per step, so that two sent together both show.
    const correction = this.#corrections.shift()
    if (correction !== undefined) {
      return { narration: `Applying the correction: ${correction}`, actions: [CLICK], usage, done: false }
    }
    const narration = SCRIPT[this.#scripted]
    if (narration !== undefined) {
      this.#scripted += 1
      return { narration, actions: [CLICK], usage, done: false }
    }
    return { narration: 'Checking the result against the instruction', actions: [], usage, done: true }
  }
}
