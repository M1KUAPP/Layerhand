// The agent loop as the server runs it: the run, where its files go, and what
// the run log needs to know about how it ended (NFR-8).
import type { RunEvent, RunHandle, RunRequest } from '../agent/contract'
import { runAgent, type AgentLoopDependencies, type PublishedKind } from '../agent/loop'
import type { AgentModel } from '../agent/model'
import { ResponsesModel } from '../agent/responses-model'
import { Spend } from '../agent/spend'
import type { ArtifactStore } from './artifact-store'
import { browserbaseEditorSession, type BrowserbaseEditorSessionOptions } from './browserbase-editor-session'
import type { ManagedRun, RunStopReason } from './managed-run'

/**
 * Frames travel over the event stream as data URLs, as docs/TRD.md § Frames
 * describes. The layered file and its preview are stored for download.
 */
export function artifactPublisher(store: ArtifactStore): AgentLoopDependencies['publish'] {
  return async (bytes: Uint8Array, kind: PublishedKind) => {
    if (kind === 'frame') return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
    const { key } = await store.put(
      kind === 'psd'
        ? { kind: 'result', bytes, contentType: 'image/vnd.adobe.photoshop' }
        : { kind: 'preview', bytes, contentType: 'image/png' }
    )
    return store.presign(key)
  }
}

/** The run ceiling, docs/TRD.md § One ceiling: fifteen minutes. */
export const RUN_CEILING_MS = 15 * 60_000

/** How long a run stopped at the ceiling may spend exporting before its browser is abandoned. */
export const EXPORT_GRACE_MS = 60_000

export interface ManagedAgentRunOptions {
  ceilingMs?: number
  exportGraceMs?: number
  /** Releases the run's browser at once. Closing the session unless given. */
  abandon?: () => Promise<void>
}

export function managedAgentRun(
  request: RunRequest,
  dependencies: AgentLoopDependencies,
  {
    ceilingMs = RUN_CEILING_MS,
    exportGraceMs = EXPORT_GRACE_MS,
    abandon = () => dependencies.session.close()
  }: ManagedAgentRunOptions = {}
): ManagedRun {
  // Mirrors the loop's own limits, so an incomplete run can say which one stopped it.
  const spend = new Spend(dependencies.pricing)
  let calls = 0
  let cachedInputTokens = 0
  let cancelled = false
  let timedOut = false
  let missingNarration = false
  let stopReason: RunStopReason = 'failed'

  const inner = dependencies.model
  const model: AgentModel = {
    async next(observation, signal) {
      calls += 1
      const turn = await inner.next(observation, signal)
      spend.add(turn.usage)
      cachedInputTokens += turn.usage.cachedInputTokens
      if ((!turn.done || turn.actions.length > 0) && !turn.narration.trim()) missingNarration = true
      return turn
    }
  }

  const stoppedBy = (complete: boolean): RunStopReason => {
    if (cancelled) return 'cancelled'
    if (missingNarration) return 'failed'
    if (complete) return 'complete'
    if (timedOut) return 'time_limit'
    if (calls >= request.stepCap) return 'step_cap'
    if (spend.wouldPass(request.budgetUsd)) return 'spend_cap'
    return 'failed'
  }

  const underlying = runAgent(request, { ...dependencies, model })

  // At the ceiling the run is cancelled, so it exports and closes as a cancel
  // does. An editor call that hangs never sees a cancel, so a run still going
  // after the grace period has its browser abandoned, which fails that call.
  let graceTimer: ReturnType<typeof setTimeout> | undefined
  const ceilingTimer = setTimeout(() => {
    timedOut = true
    void underlying.cancel()
    graceTimer = setTimeout(() => void abandon().catch(() => undefined), exportGraceMs)
  }, ceilingMs)
  void (async () => {
    for await (const _event of underlying.events) {
      // Only the end of the run matters here.
    }
    clearTimeout(ceilingTimer)
    clearTimeout(graceTimer)
  })()

  const handle: RunHandle = {
    events: {
      async *[Symbol.asyncIterator](): AsyncIterator<RunEvent> {
        for await (const event of underlying.events) {
          if (event.type === 'done') stopReason = stoppedBy(event.result.complete)
          if (event.type === 'error' && !event.recoverable && timedOut) stopReason = 'time_limit'
          yield event
        }
      }
    },
    steer: (text) => underlying.steer(text),
    async cancel() {
      cancelled = true
      await underlying.cancel()
    }
  }

  return {
    handle,
    metrics: () => ({
      cacheHitRate: spend.tokensIn > 0 ? cachedInputTokens / spend.tokensIn : null,
      stopReason
    }),
    releaseSecrets() {
      request.apiKey = undefined
    },
    abandon: () => abandon()
  }
}

export interface LiveAgentDependencies extends Pick<
  BrowserbaseEditorSessionOptions,
  'hostUrl' | 'sessions' | 'connect' | 'createEditorSession'
> {
  publish: AgentLoopDependencies['publish']
  /** Pays for the run when the user supplied no key of their own (FR-36). */
  serverApiKey?: string
  fetch?: typeof fetch
}

/**
 * A real run: GPT-6 Astra on the `computer` tool, which spike A0 chose,
 * driving Photopea in a Browserbase browser of the run's own. The model reads
 * the key from the request at every call, so releasing the run's secrets
 * leaves no copy of the key behind.
 */
export function liveAgentRun(
  request: RunRequest,
  { publish, serverApiKey, fetch, ...editor }: LiveAgentDependencies
): ManagedRun {
  if (!request.apiKey && serverApiKey) request.apiKey = serverApiKey
  const session = browserbaseEditorSession({ id: crypto.randomUUID(), ...editor })
  return managedAgentRun(
    request,
    {
      session,
      model: new ResponsesModel({
        apiKey: () => request.apiKey,
        instruction: request.instruction,
        stepCap: request.stepCap,
        mechanism: 'computer',
        ...(fetch ? { fetch } : {})
      }),
      publish
    },
    { abandon: () => session.abandon() }
  )
}
