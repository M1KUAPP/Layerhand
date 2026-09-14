import type { RunHandle } from '../agent/contract'

export type RunStopReason = 'complete' | 'step_cap' | 'spend_cap' | 'cancelled' | 'failed'

export interface ManagedRunMetrics {
  cacheHitRate: number | null
  stopReason: RunStopReason
}

export interface ManagedRun {
  handle: RunHandle
  metrics(): ManagedRunMetrics
  releaseSecrets(): void
}
