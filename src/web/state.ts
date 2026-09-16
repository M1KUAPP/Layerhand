import type { RunEvent, RunResult, RunStopReason } from '../agent/contract'
import type { RunSnapshot } from '../server/run-registry'

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
  | { view: 'error'; message: string; runId?: string }

export type ClientAction =
  | { type: 'edit' }
  | { type: 'started'; runId: string; instruction: string }
  | { type: 'restoring'; runId: string }
  | { type: 'snapshot'; snapshot: RunSnapshot; instruction?: string | null }
  | { type: 'event'; id: number; event: RunEvent }
  | { type: 'cancel_requested' }
  | { type: 'connection_failed'; message: string }
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
    cancelRequested: false
  }
}

function progressFromSnapshot(snapshot: RunSnapshot, instruction: string | null): RunProgress {
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
    cancelRequested: snapshot.status === 'cancelled'
  }
}

function fromSnapshot(snapshot: RunSnapshot, instruction: string | null): ClientState {
  if (snapshot.status === 'failed') {
    return {
      view: 'error',
      message: snapshot.failureReason ?? 'The run failed.',
      runId: snapshot.runId
    }
  }
  const progress = progressFromSnapshot(snapshot, instruction)
  if (snapshot.status === 'running' || snapshot.status === 'queued') return { view: 'running', progress }
  if (!snapshot.result) {
    return { view: 'error', message: 'The run ended without a result.', runId: snapshot.runId }
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

function reduceEvent(state: Extract<ClientState, { view: 'running' }>, id: number, event: RunEvent): ClientState {
  if (!Number.isSafeInteger(id) || id <= state.progress.lastEventId) return state
  const progress: RunProgress = {
    ...state.progress,
    corrections: [...state.progress.corrections],
    recoverableErrors: [...state.progress.recoverableErrors],
    lastEventId: id
  }

  switch (event.type) {
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
      if (!event.recoverable) {
        return { view: 'error', message: event.reason, runId: progress.runId }
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
        action.instruction ?? (state.view === 'running' ? state.progress.instruction : null)
      )
    case 'event':
      return state.view === 'running' ? reduceEvent(state, action.id, action.event) : state
    case 'cancel_requested':
      return state.view === 'running'
        ? { view: 'running', progress: { ...state.progress, cancelRequested: true } }
        : state
    case 'connection_failed':
      return {
        view: 'error',
        message: action.message,
        runId: state.view === 'running' ? state.progress.runId : state.view === 'restoring' ? state.runId : undefined
      }
    case 'reset':
      return initialClientState()
  }
}

export function formatCredits(costUsd: number): string {
  return `${Math.max(0, costUsd).toFixed(2)} credits`
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
