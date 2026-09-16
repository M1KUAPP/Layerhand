import type { RunHandle, RunStopReason } from '../agent/contract'
import type { RunFailure } from './run-failure'

export type { RunStopReason } from '../agent/contract'

export interface ManagedRunMetrics {
  cacheHitRate: number | null
  stopReason: RunStopReason
  /** For a failed run, what it failed on. Never shown to the page. */
  failure?: RunFailure
  /** Whether the run's calls went over the WebSocket or stayed on HTTP; absent when the model has none (NFR-8). */
  transport?: 'http' | 'websocket'
  /** How native steering settled the corrections it saw; absent when the model has none (NFR-8). */
  steering?: { applied: number; replayed: number; indeterminate: number }
  /** Codes of the safety checks the run acknowledged automatically; absent when the model has none (NFR-8). */
  safetyCheckCodes?: readonly string[]
}

export interface ManagedRun {
  handle: RunHandle
  metrics(): ManagedRunMetrics
  releaseSecrets(): void
  /**
   * Stops paying for the run at once: its browser is released without waiting
   * for an export. For a run that did not stop when it was cancelled.
   */
  abandon?(): Promise<void>
  /**
   * Ends the run for a server shutdown rather than a user's cancel, so the
   * run log and the page record `shutdown` in place of `cancelled` (#112).
   * `RunRegistry.close()` prefers this over `handle.cancel()` when present.
   */
  shutdown?(): Promise<void>
}
