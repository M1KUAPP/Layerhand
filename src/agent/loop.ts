// The agent loop, as docs/TRD.md § The loop describes it: show the model the
// editor, carry out the actions it returns, and repeat until it is done or the
// run is stopped. Every ending but a failure exports the file before the
// session closes, because the session holds the only copy of the work.
import type { EditorSession } from '../editor/session'
import type { RunHandle, RunRequest } from './contract'
import { EventLog } from './event-log'
import type { AgentModel, ModelTurn } from './model'
import { Spend, type TokenPricing } from './spend'

export type PublishedKind = 'frame' | 'psd' | 'preview'

export interface AgentLoopDependencies {
  /** A session with nothing open in it. The run opens the upload, then closes the session. */
  session: EditorSession
  model: AgentModel
  /** Stores bytes where the page can load them, and returns their URL. */
  publish(bytes: Uint8Array, kind: PublishedKind): Promise<string>
  pricing?: TokenPricing
}

export function runAgent(request: RunRequest, { session, model, publish, pricing }: AgentLoopDependencies): RunHandle {
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

  const showFrame = async (screenshot: Uint8Array) => {
    try {
      log.emit({ type: 'frame', pngUrl: await publish(screenshot, 'frame') })
    } catch {
      log.emit({ type: 'error', reason: 'The live view missed a frame', recoverable: true })
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
    await showFrame(screenshot)

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
        throw error
      }
      spend.add(turn.usage)
      log.emit({ type: 'cost', usd: spend.usd, tokensIn: spend.tokensIn, tokensOut: spend.tokensOut })
      if (aborter.signal.aborted) return false

      // The edit is finished only if no correction is waiting for the model.
      const finished = turn.done && corrections.length === 0
      // Decide now whether another call can follow, so that no correction is
      // acknowledged that no call will carry.
      if (limitReached() || finished) refuseCorrections()
      if (!turn.done || turn.actions.length > 0) {
        steps += 1
        log.emit({ type: 'step', n: steps, cap: request.stepCap, narration: turn.narration })
        if (turn.actions.length > 0) await session.act(turn.actions)
        screenshot = await session.screenshot()
        await showFrame(screenshot)
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
      // A cancel can leave an acknowledged correction unsent, so report that too.
      refuseCorrections()
      const psd = await session.exportPsd()
      const preview = await session.exportPreview()
      const layers = await session.layers()
      // The file is already in hand, so a session that fails to close does not cost the user their result.
      await session.close().catch(() => undefined)
      log.end({
        type: 'done',
        result: { psdUrl: await publish(psd, 'psd'), previewUrl: await publish(preview, 'preview'), layers, complete }
      })
    } catch {
      refusing = true
      await session.close().catch(() => undefined)
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
