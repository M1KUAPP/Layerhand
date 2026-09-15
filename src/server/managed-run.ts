import type { RunHandle } from '../agent/contract'

export type RunStopReason = 'complete' | 'step_cap' | 'spend_cap' | 'time_limit' | 'cancelled' | 'failed'

export interface ManagedRunMetrics {
  cacheHitRate: number | null
  stopReason: RunStopReason
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
