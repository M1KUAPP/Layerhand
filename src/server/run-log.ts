// One structured line per finished run, as docs/TRD.md § Observability asks
// (NFR-8). Frames are never logged, instructions only truncated, and anything
// shaped like an API key is redacted before it is written anywhere.
import type { SQL } from 'bun'

import type { RunStopReason } from './managed-run'
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
  instruction: string
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
    failureReason: snapshot.failureReason === undefined ? null : redact(snapshot.failureReason),
    instruction: truncate(instruction)
  }
}

export interface RunLoggerOptions {
  /** Receives each line as one NDJSON record, newline included. */
  write(record: string): void
  store?: RunLogStore
}

/**
 * A terminal hook for RunRegistry: writes the line, then stores it. One sink
 * failing does not stop the other, and the hook still rejects afterwards.
 */
export function createRunLogger({ write, store }: RunLoggerOptions): (run: TerminalRun) => Promise<void> {
  return async (run) => {
    const line = runLogLine(run)
    let written = true
    let writeError: unknown
    try {
      write(`${JSON.stringify(line)}\n`)
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
        cache_hit_rate, duration_ms, outcome, failure_reason, instruction
      )
      VALUES (
        ${line.runId}, ${line.completedAt}, ${line.steps}, ${line.capHit}, ${line.tokensIn},
        ${line.tokensOut}, ${line.costUsd}, ${line.cacheHitRate}, ${line.durationMs},
        ${line.outcome}, ${line.failureReason}, ${line.instruction}
      )
      ON CONFLICT (run_id) DO NOTHING
    `
  }
}
