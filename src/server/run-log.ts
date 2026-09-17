// One structured line per finished run, as docs/TRD.md § Observability asks
// (NFR-8). Frames are never logged, instructions only truncated, and anything
// shaped like an API key is redacted before it is written anywhere.
import type { SQL } from 'bun'

import type { RunStopReason } from './managed-run'
import type { RunFailureCode } from './run-failure'
import type { TerminalRun } from './run-registry'

const MAX_INSTRUCTION = 80
const API_KEY_PATTERN = /sk-[A-Za-z0-9_-]{8,}/g
const REDACTED = '[redacted]'

export interface RunLogLine {
  runId: string
  completedAt: string
  steps: number
  capHit: boolean
  tokensIn: number
  tokensOut: number
  costUsd: number
  cacheHitRate: number | null
  durationMs: number
  outcome: RunStopReason
  failureReason: string | null
  /** Which call a failed run failed on, so launch day can be triaged without the message. */
  failureCode: RunFailureCode | null
  instruction: string
  /** Whether the run's calls went over the WebSocket or stayed on HTTP; 'http' when the model has no native steering (NFR-8). */
  transport: 'http' | 'websocket'
  /** How many corrections native steering delivered; zero when the model has no native steering (NFR-8). */
  correctionsApplied: number
  /** How many corrections were handed back for replay, indeterminate ones included (NFR-8). */
  correctionsReplayed: number
  /** Of those replayed, how many a dropped connection settled without evidence (NFR-8). */
  correctionsIndeterminate: number
  /** Codes of the safety checks the run acknowledged automatically; empty when there were none (NFR-8). */
  safetyCheckCodes: readonly string[]
  /** How many actions the run refused for typing Photopea's scripting interface through the computer tool (#109). */
  refusedActions: number
}

export interface RunLogStore {
  append(line: RunLogLine): Promise<void>
}

function redact(text: string): string {
  return text.replace(API_KEY_PATTERN, REDACTED)
}

// Redacts before truncating, so a cut can never leave part of a key behind.
function truncate(text: string): string {
  const characters = Array.from(redact(text))
  if (characters.length <= MAX_INSTRUCTION) return characters.join('')
  return `${characters.slice(0, MAX_INSTRUCTION - 1).join('')}…`
}

// A run can fail without an unrecoverable error: the loop ends a run whose
// model took a step without narrating it through a recoverable error and an
// incomplete result. Its last recoverable error is then the reason.
function failureReason(snapshot: TerminalRun['snapshot'], outcome: RunStopReason): string | null {
  const reason = snapshot.failureReason ?? (outcome === 'failed' ? snapshot.recoverableErrors.at(-1) : undefined)
  return reason === undefined ? null : redact(reason)
}

export function runLogLine({ runId, instruction, startedAt, completedAt, snapshot, metrics }: TerminalRun): RunLogLine {
  return {
    runId,
    completedAt: new Date(completedAt).toISOString(),
    steps: snapshot.steps,
    capHit: metrics.stopReason === 'step_cap' || metrics.stopReason === 'spend_cap',
    tokensIn: snapshot.tokensIn,
    tokensOut: snapshot.tokensOut,
    costUsd: snapshot.costUsd,
    cacheHitRate: metrics.cacheHitRate,
    durationMs: Math.max(0, completedAt - startedAt),
    outcome: metrics.stopReason,
    failureReason: failureReason(snapshot, metrics.stopReason),
    failureCode: metrics.stopReason === 'failed' ? (metrics.failure?.code ?? 'run_failed') : null,
    instruction: truncate(instruction),
    transport: metrics.transport ?? 'http',
    correctionsApplied: metrics.steering?.applied ?? 0,
    correctionsReplayed: metrics.steering?.replayed ?? 0,
    correctionsIndeterminate: metrics.steering?.indeterminate ?? 0,
    safetyCheckCodes: metrics.safetyCheckCodes ?? [],
    refusedActions: metrics.refusedActions ?? 0
  }
}

export interface RunLoggerOptions {
  /** Receives each line as one NDJSON record, newline included. */
  write(record: string): void
  /** Receives one NDJSON record per failed run, with the error that caused it, already redacted. */
  writeFailure?(record: string): void
  store?: RunLogStore
}

/**
 * A terminal hook for RunRegistry: writes the line, then stores it. One sink
 * failing does not stop the other, and the hook still rejects afterwards.
 */
export function createRunLogger({ write, writeFailure, store }: RunLoggerOptions): (run: TerminalRun) => Promise<void> {
  return async (run) => {
    const line = runLogLine(run)
    let written = true
    let writeError: unknown
    try {
      write(`${JSON.stringify(line)}\n`)
      const failure = run.metrics.failure
      if (line.outcome === 'failed' && failure) {
        writeFailure?.(
          `${JSON.stringify({
            event: 'run_failed',
            runId: run.runId,
            step: run.snapshot.steps,
            failureCode: failure.code,
            errorName: failure.errorName,
            message: failure.message,
            stack: failure.stack
          })}\n`
        )
      }
    } catch (error) {
      written = false
      writeError = error
    }
    await store?.append(line)
    if (!written) throw writeError
  }
}

export class SqlRunLogStore implements RunLogStore {
  readonly #database: SQL

  constructor(database: SQL) {
    this.#database = database
  }

  async append(line: RunLogLine): Promise<void> {
    await this.#database`
      INSERT INTO run_log (
        run_id, completed_at, steps, cap_hit, tokens_in, tokens_out, cost_usd,
        cache_hit_rate, duration_ms, outcome, failure_reason, failure_code, instruction,
        transport, corrections_applied, corrections_replayed, corrections_indeterminate,
        safety_check_codes, refused_actions
      )
      VALUES (
        ${line.runId}, ${line.completedAt}, ${line.steps}, ${line.capHit}, ${line.tokensIn},
        ${line.tokensOut}, ${line.costUsd}, ${line.cacheHitRate}, ${line.durationMs},
        ${line.outcome}, ${line.failureReason}, ${line.failureCode}, ${line.instruction},
        ${line.transport}, ${line.correctionsApplied}, ${line.correctionsReplayed},
        ${line.correctionsIndeterminate}, ${JSON.stringify(line.safetyCheckCodes)}, ${line.refusedActions}
      )
      ON CONFLICT (run_id) DO NOTHING
    `
  }
}
