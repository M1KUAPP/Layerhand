// The agent loop's view of the model: one call per step. The Responses API
// adapter will implement it for GPT-6 Astra; tests implement it with a script.
import type { ComputerAction } from '../editor/session'

export interface TokenUsage {
  /** Every input token the call sent, cached ones included. */
  inputTokens: number
  /** The part of inputTokens read from the prompt cache. */
  cachedInputTokens: number
  outputTokens: number
}

export interface Observation {
  /** The editor as it looks now: a PNG of the viewport. */
  screenshot: Uint8Array
  /** Corrections sent since the previous call, oldest first (FR-20). */
  corrections: string[]
}

export interface ModelTurn {
  /** What this step does, in plain words (FR-11). */
  narration: string
  /** The actions to carry out, in order. */
  actions: ComputerAction[]
  usage: TokenUsage
  /**
   * Whether the model considers the edit finished once these actions, usually
   * none, are carried out. A turn that is not done is a step even without
   * actions, as when the model changed the editor by running code.
   */
  done: boolean
}

export interface AgentModel {
  /** Asks for the next step. Should reject once `signal` aborts; the run stops waiting either way. */
  next(observation: Observation, signal: AbortSignal): Promise<ModelTurn>
}
