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
  /** Every response the call was billed for, added together. */
  usage: TokenUsage
  /**
   * The response the call ended on, when the call was billed for more than
   * one, as a steered call is. The next call continues from that response
   * alone, so the spend cap estimates it from this (NFR-2).
   */
  lastResponseUsage?: TokenUsage
  /**
   * Whether the model considers the edit finished once these actions, usually
   * none, are carried out. A turn that is not done is a step even without
   * actions, as when the model changed the editor by running code.
   */
  done: boolean
}

/**
 * What a model throws when a call still fails once its retries have run out.
 * The loop ends the run as a cap does, with the file made so far, rather than
 * as a failure (docs/TRD.md § Contract 2).
 */
export class ModelUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ModelUnavailableError'
  }
}

/** A correction a model sent to steer the call in flight (#9). */
export interface NativeSteer {
  /**
   * Whether native steering has applied the correction: a response the model
   * answered with saw it. It turns true only as a call ends, and stays true.
   */
  readonly applied: boolean
}

export interface AgentModel {
  /**
   * Asks for the next step. Should reject once `signal` aborts; the run stops
   * waiting either way. Rejects with ModelUnavailableError once a call has
   * failed past its retries.
   */
  next(observation: Observation, signal: AbortSignal): Promise<ModelTurn>
  /**
   * Offers a correction the loop has just acknowledged and queued, so a model
   * that can steer the call in flight applies it at once (#9). Returns the
   * native steer, if the model sent one, so the loop neither reports a
   * correction native steering applied as undelivered nor makes a call only to
   * carry it. Every correction offered is still passed with a later call, if
   * one follows, in the same order, and a model that applied one natively must
   * not deliver it twice.
   */
  steer?(text: string): NativeSteer | undefined
  /** Releases whatever the model holds, such as a socket. Called once, when the run ends. */
  close?(): void
}
