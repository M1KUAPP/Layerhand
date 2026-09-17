import type { RunResult, RunStopReason } from '../agent/contract'
import { strandedCorrectionNumbers } from '../agent/stranded-corrections'
import type { RunSnapshot, RunStreamEvent } from '../server/run-registry'

// The first step event reports the configured cap; until it arrives the
// rail falls back to the server's default (DEFAULT_RUN_LIMITS.stepCap).
const DEFAULT_STEP_CAP = 40

export interface RunProgress {
  runId: string
  instruction: string | null
  steps: number
  cap: number | null
  narration: string | null
  frameUrl: string | null
  costUsd: number
  tokensIn: number
  tokensOut: number
  corrections: string[]
  recoverableErrors: string[]
  lastEventId: number
  cancelRequested: boolean
  /** While the run waits for a slot, its place in line (NFR-4). */
  queuePosition: number | null
  /** A watched run (a `?watch=` link, or a stored run with no stored token) shows no controls. */
  viewOnly: boolean
}

export type ClientState =
  | { view: 'landing' }
  | { view: 'input' }
  | { view: 'restoring'; runId: string }
  | { view: 'running'; progress: RunProgress }
  | {
      view: 'result'
      progress: RunProgress
      result: RunResult
      outcome: RunStopReason
    }
  // Reconnecting is only worth offering when the connection, not the run
  // itself, is what failed (#126): a run the server ended for good just
  // returns the same failure again.
  | { view: 'error'; message: string; runId?: string; reconnectable: boolean }

export type ClientAction =
  | { type: 'edit' }
  | { type: 'started'; runId: string; instruction: string }
  | { type: 'restoring'; runId: string }
  | { type: 'snapshot'; snapshot: RunSnapshot; instruction?: string | null; viewOnly?: boolean }
  | { type: 'event'; id: number; event: RunStreamEvent }
  | { type: 'cancel_requested' }
  | { type: 'action_refused'; message: string }
  | { type: 'connection_failed'; message: string }
  // A stated server answer (a `RunApiError`) rather than a dropped
  // connection, so reconnecting would just repeat the same refusal (#126).
  | { type: 'run_unavailable'; message: string }
  | { type: 'reset' }

function emptyProgress(runId: string, instruction: string): RunProgress {
  return {
    runId,
    instruction,
    steps: 0,
    cap: DEFAULT_STEP_CAP,
    narration: null,
    frameUrl: null,
    costUsd: 0,
    tokensIn: 0,
    tokensOut: 0,
    corrections: [],
    recoverableErrors: [],
    lastEventId: -1,
    cancelRequested: false,
    queuePosition: null,
    viewOnly: false
  }
}

function progressFromSnapshot(snapshot: RunSnapshot, instruction: string | null, viewOnly: boolean): RunProgress {
  return {
    runId: snapshot.runId,
    instruction,
    steps: snapshot.steps,
    cap: snapshot.cap ?? DEFAULT_STEP_CAP,
    narration: snapshot.narration,
    frameUrl: snapshot.frameUrl,
    costUsd: snapshot.costUsd,
    tokensIn: snapshot.tokensIn,
    tokensOut: snapshot.tokensOut,
    corrections: [...snapshot.corrections],
    recoverableErrors: [...snapshot.recoverableErrors],
    lastEventId: snapshot.lastEventId,
    cancelRequested: snapshot.status === 'cancelled',
    queuePosition: snapshot.queuePosition ?? null,
    viewOnly
  }
}

function fromSnapshot(snapshot: RunSnapshot, instruction: string | null, viewOnly: boolean): ClientState {
  if (snapshot.status === 'failed') {
    return {
      view: 'error',
      message: snapshot.failureReason ?? 'The run failed.',
      runId: snapshot.runId,
      reconnectable: false
    }
  }
  const progress = progressFromSnapshot(snapshot, instruction, viewOnly)
  if (snapshot.status === 'running' || snapshot.status === 'queued') return { view: 'running', progress }
  if (!snapshot.result) {
    return {
      view: 'error',
      message: 'The run ended without a result.',
      runId: snapshot.runId,
      reconnectable: false
    }
  }
  return {
    view: 'result',
    progress,
    result: snapshot.result,
    // The stop reason is the true one (step cap, spend cap, time limit,
    // shutdown, or cancel); a snapshot from before it was recorded falls
    // back to no reason rather than guessing one, as an unrecognised
    // `failed` stop reason already does.
    outcome: snapshot.stopReason ?? (snapshot.result.complete ? 'complete' : 'failed')
  }
}

function reduceEvent(state: Extract<ClientState, { view: 'running' }>, id: number, event: RunStreamEvent): ClientState {
  if (!Number.isSafeInteger(id) || id <= state.progress.lastEventId) return state
  const progress: RunProgress = {
    ...state.progress,
    corrections: [...state.progress.corrections],
    recoverableErrors: [...state.progress.recoverableErrors],
    lastEventId: id,
    // Any event but a new place in line means the run has left the queue.
    queuePosition: null
  }

  switch (event.type) {
    case 'queued':
      progress.queuePosition = event.position
      break
    case 'started':
      break
    case 'step':
      progress.steps = event.n
      progress.cap = event.cap
      progress.narration = event.narration
      break
    case 'frame':
      progress.frameUrl = event.pngUrl
      break
    case 'correction_ack':
      progress.corrections.push(event.text)
      break
    case 'cost':
      progress.costUsd = event.usd
      progress.tokensIn = event.tokensIn
      progress.tokensOut = event.tokensOut
      break
    case 'error':
      // A run that left the queue has nothing to show, so the form comes back.
      if (!event.recoverable && state.progress.queuePosition !== null && state.progress.cancelRequested) {
        return { view: 'input' }
      }
      if (!event.recoverable) {
        return { view: 'error', message: event.reason, runId: progress.runId, reconnectable: false }
      }
      progress.recoverableErrors.push(event.reason)
      break
    case 'done':
      return {
        view: 'result',
        progress,
        result: event.result,
        // Trusts the server's stop reason over the locally tracked cancel
        // request, so a live 'done' agrees with what a reload would show
        // (a run may end for a reason other than the cancel the user sent).
        outcome: event.result.stopReason ?? (event.result.complete ? 'complete' : 'failed')
      }
  }
  return { view: 'running', progress }
}

export function initialClientState(): ClientState {
  return { view: 'landing' }
}

// Whether `state` still refers to the run a slow cancel or correction
// request was sent for, so a request that settles after the view has moved
// to a different run is not attributed to it (#123).
export function isCurrentRun(state: ClientState, runId: string): boolean {
  return (state.view === 'running' || state.view === 'result') && state.progress.runId === runId
}

// A refused correction or cancel does not end the run: the running view or
// the result stays on screen, with the refusal shown as a notice (#123).
function withRefusalNotice(state: ClientState, message: string): ClientState {
  if (state.view === 'running') {
    return {
      view: 'running',
      progress: { ...state.progress, recoverableErrors: [...state.progress.recoverableErrors, message] }
    }
  }
  if (state.view === 'result') {
    return {
      ...state,
      progress: { ...state.progress, recoverableErrors: [...state.progress.recoverableErrors, message] }
    }
  }
  return state
}

export function reduceClientState(state: ClientState, action: ClientAction): ClientState {
  switch (action.type) {
    case 'edit':
      return { view: 'input' }
    case 'started':
      return { view: 'running', progress: emptyProgress(action.runId, action.instruction) }
    case 'restoring':
      return { view: 'restoring', runId: action.runId }
    case 'snapshot':
      return fromSnapshot(
        action.snapshot,
        action.instruction ?? (state.view === 'running' ? state.progress.instruction : null),
        // A reconnect snapshot carries no flag: the run keeps the one it
        // was restored with rather than regaining controls mid-watch.
        action.viewOnly ?? (state.view === 'running' || state.view === 'result' ? state.progress.viewOnly : false)
      )
    case 'event':
      return state.view === 'running' ? reduceEvent(state, action.id, action.event) : state
    case 'cancel_requested':
      return state.view === 'running'
        ? { view: 'running', progress: { ...state.progress, cancelRequested: true } }
        : state
    case 'action_refused':
      return withRefusalNotice(state, action.message)
    case 'connection_failed':
      return {
        view: 'error',
        message: action.message,
        runId: state.view === 'running' ? state.progress.runId : state.view === 'restoring' ? state.runId : undefined,
        reconnectable: true
      }
    case 'run_unavailable':
      return { view: 'error', message: action.message, reconnectable: false }
    case 'reset':
      return initialClientState()
  }
}

export function formatCredits(costUsd: number): string {
  return `${Math.max(0, costUsd).toFixed(2)} credits`
}

export interface CorrectionStatus {
  text: string
  /** False for a correction the run acknowledged but never reached the agent (FR-22). */
  delivered: boolean
}

// The recoverable error naming which acknowledged corrections (1-based,
// src/agent/stranded-corrections.ts) never reached the agent — a cancel or a
// cap can strand one. Matched by exact number, not by trailing position:
// native steering can leave an earlier correction still queued while a
// later one has already been applied, so "the last N" is not always the
// right N (#124).
function strandedCorrectionPositions(recoverableErrors: readonly string[]): ReadonlySet<number> {
  for (const message of recoverableErrors) {
    const numbers = strandedCorrectionNumbers(message)
    if (numbers) return new Set(numbers)
  }
  return new Set()
}

// Every correction the run acknowledged, marked with whether it reached the
// agent, for the result view's list (#124). A correction's number is its
// 1-based position in this list, matching how loop.ts numbers it.
export function correctionStatuses(progress: RunProgress): CorrectionStatus[] {
  const stranded = strandedCorrectionPositions(progress.recoverableErrors)
  return progress.corrections.map((text, index) => ({ text, delivered: !stranded.has(index + 1) }))
}

// The true reason a run isn't complete (FR-12, FR-13), not always the step
// cap: a model failure states none, because it did not stop on any cap.
export function resultOutcomeText(outcome: RunStopReason): string {
  switch (outcome) {
    case 'complete':
      return 'The requested retouch completed.'
    case 'cancelled':
      return 'You cancelled the run. Layerhand kept the work completed so far.'
    case 'shutdown':
      return 'The service restarted before the run finished. Layerhand kept the work completed so far.'
    case 'step_cap':
      return 'The step cap was reached. Layerhand kept the work completed so far.'
    case 'spend_cap':
      return 'The spend limit was reached. Layerhand kept the work completed so far.'
    case 'time_limit':
      return 'The time limit was reached. Layerhand kept the work completed so far.'
    case 'failed':
      return 'Layerhand kept the work completed so far.'
  }
}
