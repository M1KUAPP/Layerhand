// Contract 2, run orchestration, as docs/TRD.md specifies it: what the web
// application sends to start a run, and everything the run reports back.
import type { LayerInfo, Viewport } from '../editor/contract'

export interface RunRequest {
  image: Uint8Array
  filename: string
  instruction: string // FR-2
  stepCap: number // FR-12
  budgetUsd: number // NFR-2
  apiKey?: string // FR-36, never persisted
}

export type RunEvent =
  | { type: 'started'; runId: string; viewport: Viewport }
  | { type: 'step'; n: number; cap: number; narration: string } // FR-11
  | { type: 'frame'; pngUrl: string } // FR-10
  | { type: 'correction_ack'; text: string } // FR-21
  | { type: 'cost'; usd: number; tokensIn: number; tokensOut: number }
  | { type: 'done'; result: RunResult }
  | { type: 'error'; reason: string; recoverable: boolean }

// Why a run isn't complete, or that it is. Set by the managed run that wraps
// the loop with the step cap, the spend cap, the time limit, a cancel, and a
// server shutdown; a bare loop result leaves it out.
export type RunStopReason = 'complete' | 'step_cap' | 'spend_cap' | 'time_limit' | 'shutdown' | 'cancelled' | 'failed'

export interface RunResult {
  psdUrl: string
  previewUrl: string
  layers: LayerInfo[]
  complete: boolean // false if the run stopped before finishing, FR-12
  stopReason?: RunStopReason // step cap, spend cap, time limit, shutdown, or cancel
}

export interface RunHandle {
  events: AsyncIterable<RunEvent>
  steer(text: string): Promise<void> // FR-20
  cancel(): Promise<void> // FR-13
}
