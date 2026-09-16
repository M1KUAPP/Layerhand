import type { RunEvent, RunResult } from '../agent/contract'
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
  | { view: 'running'; progress: RunProgress }
  | {
      view: 'result'
      progress: RunProgress
      result: RunResult
      outcome: 'complete' | 'incomplete' | 'cancelled'
    }
  | { view: 'error'; message: string; runId?: string }

export type ClientAction =
  | { type: 'edit' }
  | { type: 'started'; runId: string; instruction: string }
  | { type: 'snapshot'; snapshot: RunSnapshot }
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
  if (snapshot.status === 'running') return { view: 'running', progress }
  if (!snapshot.result) {
    return { view: 'error', message: 'The run ended without a result.', runId: snapshot.runId }
  }
  return {
    view: 'result',
    progress,
    result: snapshot.result,
    outcome: snapshot.status
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
        outcome: progress.cancelRequested ? 'cancelled' : event.result.complete ? 'complete' : 'incomplete'
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
    case 'snapshot':
      return fromSnapshot(action.snapshot, null)
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
        runId: state.view === 'running' ? state.progress.runId : undefined
      }
    case 'reset':
      return initialClientState()
  }
}

export function formatCredits(costUsd: number): string {
  return `${Math.max(0, costUsd).toFixed(2)} credits`
}
