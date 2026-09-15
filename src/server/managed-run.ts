import type { RunHandle } from '../agent/contract'
import type { RunFailure } from './run-failure'

export type RunStopReason = 'complete' | 'step_cap' | 'spend_cap' | 'time_limit' | 'cancelled' | 'failed'

export interface ManagedRunMetrics {
  cacheHitRate: number | null
  stopReason: RunStopReason
  /** For a failed run, what it failed on. Never shown to the page. */
  failure?: RunFailure
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
}
