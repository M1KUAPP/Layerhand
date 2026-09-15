// Why a failed run failed, for whoever triages it and never for the page
// (NFR-8). The page keeps its fixed reason. This keeps the failing call, the
// error's name, its message with keys and web addresses removed, and the first
// frames of its stack.
import type { AgentLoopDependencies } from '../agent/loop'
import type { AgentModel } from '../agent/model'
import type { EditorSession } from '../editor/session'

export type RunFailureCode =
  | 'model_call_failed'
  | 'editor_open_failed'
  | 'editor_action_failed'
  | 'editor_screenshot_failed'
  | 'export_failed'
  | 'publish_failed'
  | 'layer_policy_failed'
  | 'missing_narration'
  | 'run_failed'

export interface RunFailure {
  code: RunFailureCode
  /** The error's constructor name, when there was an error. */
  errorName: string | null
  message: string | null
  /** At most three frames. */
  stack: string[]
}

const API_KEY = /sk-[A-Za-z0-9_-]{8,}/g
// Web and socket addresses can carry signed parameters; file paths in stack frames cannot.
const ADDRESS = /\b(?:https?|wss?):\/\/[^\s"'`<>)\]]+/gi
const MAX_MESSAGE = 500
const MAX_FRAMES = 3

export function redactDiagnostic(text: string): string {
  return text.replace(ADDRESS, '[url]').replace(API_KEY, '[redacted]')
}

export function describeFailure(code: RunFailureCode, error?: unknown): RunFailure {
  if (!(error instanceof Error)) {
    return { code, errorName: error === undefined ? null : typeof error, message: null, stack: [] }
  }
  // The stack's own first lines repeat the message, so only its frames are kept.
  const frames = (error.stack ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '))
    .slice(0, MAX_FRAMES)
  return {
    code,
    errorName: error.constructor.name,
    message: redactDiagnostic(error.message).slice(0, MAX_MESSAGE),
    stack: frames.map(redactDiagnostic)
  }
}

type Operation = 'model' | 'open' | 'act' | 'screenshot' | 'export' | 'publish'

const CODES: Readonly<Record<Operation, RunFailureCode>> = {
  model: 'model_call_failed',
  open: 'editor_open_failed',
  act: 'editor_action_failed',
  screenshot: 'editor_screenshot_failed',
  export: 'export_failed',
  publish: 'publish_failed'
}

/** Watches the calls a run makes to its model, editor, and store, so a failed run can say which one failed. */
export class FailureRecorder {
  #last: { operation: Operation; error: unknown } | undefined
  // The live view takes screenshots on its own, and a missed frame does not end
  // the run, so a screenshot failure is only the cause when nothing else is.
  #lastScreenshotError: { error: unknown } | undefined
  #layersRead = false

  model(model: AgentModel): AgentModel {
    return { next: (observation, signal) => this.#track('model', () => model.next(observation, signal)) }
  }

  session(session: EditorSession): EditorSession {
    const track = <T>(operation: Operation, call: () => Promise<T>) => this.#track(operation, call)
    const recorder = this
    return {
      get id() {
        return session.id
      },
      get viewport() {
        return session.viewport
      },
      open: (image, filename) => track('open', () => session.open(image, filename)),
      act: (actions) => track('act', () => session.act(actions)),
      screenshot: () => track('screenshot', () => session.screenshot()),
      async layers() {
        const layers = await track('export', () => session.layers())
        recorder.#layersRead = true
        return layers
      },
      exportPsd: () => track('export', () => session.exportPsd()),
      exportPreview: () => track('export', () => session.exportPreview()),
      close: () => session.close()
    }
  }

  publish(publish: AgentLoopDependencies['publish']): AgentLoopDependencies['publish'] {
    return (bytes, kind) => this.#track('publish', () => publish(bytes, kind))
  }

  /** The most likely cause of a failed run, given what was watched. */
  failure(missingNarration: boolean): RunFailure {
    if (this.#last) return describeFailure(CODES[this.#last.operation], this.#last.error)
    if (missingNarration) return describeFailure('missing_narration')
    // Every call succeeded through reading the layers, so the loop refused the layer tree.
    if (this.#layersRead) return describeFailure('layer_policy_failed')
    if (this.#lastScreenshotError) return describeFailure('editor_screenshot_failed', this.#lastScreenshotError.error)
    return describeFailure('run_failed')
  }

  async #track<T>(operation: Operation, call: () => Promise<T>): Promise<T> {
    try {
      return await call()
    } catch (error) {
      if (operation === 'screenshot') this.#lastScreenshotError = { error }
      else this.#last = { operation, error }
      throw error
    }
  }
}
