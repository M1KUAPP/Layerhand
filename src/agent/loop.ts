// The agent loop, as docs/TRD.md § The loop describes it: show the model the
// editor, carry out the actions it returns, and repeat until it is done or the
// run is stopped. Every ending exports before the session closes; a failure's
// export is bounded and best-effort because teardown must stop browser billing.
import { startFramePump, type FramePump } from '../browser/frame-pump'
import type { EditorSession } from '../editor/session'
import { assertCompleteLayerTree } from '../editor/layer-tree-policy'
import type { RunHandle, RunRequest } from './contract'
import { EventLog } from './event-log'
import { ModelUnavailableError, type AgentModel, type ModelTurn } from './model'
import { Spend, type TokenPricing } from './spend'

export type PublishedKind = 'frame' | 'psd' | 'preview'

export interface AgentLoopDependencies {
  /** A session with nothing open in it. The run opens the upload, then closes the session. */
  session: EditorSession
  model: AgentModel
  /** Stores bytes where the page can load them, and returns their URL. */
  publish(bytes: Uint8Array, kind: PublishedKind): Promise<string>
  pricing?: TokenPricing
  /** Milliseconds between frames of the live view; one second unless set (FR-10). */
  frameIntervalMs?: number
  /** Bounds the best-effort PSD export after an unexpected failure. */
  errorExportTimeoutMs?: number
  /** Force-releases a hosted editor when its normal close path cannot drain. */
  abandon?: () => Promise<void>
  /** Captures the failure that triggered fatal cleanup before cleanup can fail too. */
  captureFailure?: () => void
}

// FR-11 asks for narration short enough to read while the editor moves.
const MAX_NARRATION = 80
const ERROR_EXPORT_TIMEOUT_MS = 4_000

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// Cuts between whole characters as a reader sees them, so an emoji is never
// split, even one joined from several code points.
function cut(narration: string): string {
  const characters = Array.from(graphemes.segment(narration), (part) => part.segment)
  if (characters.length <= MAX_NARRATION) return narration
  return `${characters
    .slice(0, MAX_NARRATION - 1)
    .join('')
    .trimEnd()}…`
}

export function runAgent(
  request: RunRequest,
  {
    session,
    model,
    publish,
    pricing,
    frameIntervalMs,
    errorExportTimeoutMs,
    abandon,
    captureFailure
  }: AgentLoopDependencies
): RunHandle {
  const log = new EventLog()
  const spend = new Spend(pricing)
  const aborter = new AbortController()
  // Rejects on cancel, so a model call that ignores the abort signal cannot hold the run open.
  const cancelled = new Promise<never>((_resolve, reject) => {
    aborter.signal.addEventListener('abort', () => reject(aborter.signal.reason), { once: true })
  })
  cancelled.catch(() => undefined)
  const corrections: string[] = []
  // Set once no further model call can carry a correction.
  let refusing = false
  let calls = 0
  // The page's view of the editor, captured on a cadence of its own rather
  // than once a step, so it keeps moving while the model thinks (FR-10).
  let liveView: FramePump | undefined
  let psdExportStarted = false

  const exportPsd = () => {
    psdExportStarted = true
    return session.exportPsd()
  }

  const bestEffortErrorExport = async (): Promise<'settled' | 'timed_out'> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<'timed_out'>((resolve) => {
      timer = setTimeout(() => resolve('timed_out'), errorExportTimeoutMs ?? ERROR_EXPORT_TIMEOUT_MS)
    })
    try {
      return await Promise.race([
        Promise.resolve()
          .then(exportPsd)
          .catch(() => undefined)
          .then(() => 'settled' as const),
        deadline
      ])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  // Whether a limit rules out another model call (FR-12, NFR-2).
  const limitReached = () => calls >= request.stepCap || spend.wouldPass(request.budgetUsd)

  // Stops taking corrections. One acknowledged but not yet sent is reported rather than dropped.
  const refuseCorrections = () => {
    refusing = true
    if (corrections.splice(0).length > 0) {
      log.emit({ type: 'error', reason: 'The run stopped before a correction reached the agent', recoverable: true })
    }
  }

  // Resolves true if the agent finished the edit, false if the run stopped first.
  const work = async (): Promise<boolean> => {
    await session.open(request.image, request.filename)
    let screenshot = await session.screenshot()
    liveView = startFramePump({
      capture: () => session.screenshot(),
      publish: (frame) => publish(frame, 'frame'),
      onFrame: (pngUrl) => log.emit({ type: 'frame', pngUrl }),
      onMissedFrame: () => log.emit({ type: 'error', reason: 'The live view missed a frame', recoverable: true }),
      intervalMs: frameIntervalMs
    })

    let steps = 0
    while (!aborter.signal.aborted) {
      if (limitReached()) {
        refuseCorrections()
        return false
      }
      calls += 1
      let turn: ModelTurn
      try {
        const observation = { screenshot, corrections: corrections.splice(0) }
        turn = await Promise.race([model.next(observation, aborter.signal), cancelled])
      } catch (error) {
        if (aborter.signal.aborted) return false
        if (!(error instanceof ModelUnavailableError)) throw error
        // A model that stopped answering ends the run as a cap does. Its
        // reason comes last: the run log takes a stopped run's last
        // recoverable error as why it stopped.
        refuseCorrections()
        log.emit({ type: 'error', reason: 'The model stopped answering, so the run stopped', recoverable: true })
        return false
      }
      spend.add(turn.usage, turn.lastResponseUsage)
      log.emit({ type: 'cost', usd: spend.usd, tokensIn: spend.tokensIn, tokensOut: spend.tokensOut })
      if (aborter.signal.aborted) return false

      const takesStep = !turn.done || turn.actions.length > 0
      const narration = turn.narration.trim()
      if (takesStep && !narration) {
        // A step the model does not describe stops the run, rather than leaving the page silent.
        refuseCorrections()
        log.emit({
          type: 'error',
          reason: 'The agent took a step without describing it, so the run stopped',
          recoverable: true
        })
        return false
      }
      // The edit is finished only if no correction is waiting for the model.
      const finished = turn.done && corrections.length === 0
      // Decide now whether another call can follow, so that no correction is
      // acknowledged that no call will carry.
      if (limitReached() || finished) refuseCorrections()
      if (takesStep) {
        steps += 1
        log.emit({ type: 'step', n: steps, cap: request.stepCap, narration: cut(narration) })
        if (turn.actions.length > 0) await session.act(turn.actions)
        screenshot = await session.screenshot()
      }
      // A correction that arrived during the finishing call gets one more call.
      if (finished) return true
    }
    return false
  }

  log.emit({ type: 'started', runId: crypto.randomUUID(), viewport: session.viewport })

  void (async () => {
    try {
      const complete = await work()
      // No frame may follow the end of the run, and no look at the editor
      // should overlap its export, so the live view stops first. A frame in
      // progress gets up to a second to settle.
      await liveView?.stop()
      // A cancel can leave an acknowledged correction unsent, so report that too.
      refuseCorrections()
      const psd = await exportPsd()
      const preview = await session.exportPreview()
      const layers = await session.layers()
      if (complete) assertCompleteLayerTree(layers)
      // The file is already in hand, so a session that fails to close does not cost the user their result.
      await session.close().catch(() => undefined)
      log.end({
        type: 'done',
        result: { psdUrl: await publish(psd, 'psd'), previewUrl: await publish(preview, 'preview'), layers, complete }
      })
    } catch {
      try {
        captureFailure?.()
      } catch {
        // Diagnostics must never hold the editor open during fatal cleanup.
      }
      refusing = true
      await liveView?.stop().catch(() => undefined)
      const errorExport = psdExportStarted ? 'settled' : await bestEffortErrorExport()
      if (errorExport === 'timed_out' && abandon) await abandon().catch(() => undefined)
      else await session.close().catch(() => undefined)
      // Provider messages can quote a key or a request, so none reaches the page.
      log.end({ type: 'error', reason: 'The run stopped because of an unexpected error', recoverable: false })
    }
  })()

  return {
    events: log,

    async steer(text) {
      if (refusing) throw new Error('The run is stopping, so the correction was not applied')
      corrections.push(text)
      log.emit({ type: 'correction_ack', text })
    },

    async cancel() {
      refusing = true
      aborter.abort()
    }
  }
}
