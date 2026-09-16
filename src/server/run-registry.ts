import type { RunEvent, RunResult } from '../agent/contract'
import { cloneLayerTree } from '../editor/layer-tree'
import type { ManagedRun, ManagedRunMetrics } from './managed-run'

const DEFAULT_RETENTION_MS = 60 * 60 * 1000

// Cloud Run allows ten seconds after SIGTERM, which a cancel phase and an
// abandon phase of this length both fit inside.
const SHUTDOWN_GRACE_MS = 4_000

/** Resolves when the promise settles, or after `ms`, whichever is first. */
function within(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    promise.then(done, done)
  })
}

export type RunStatus = 'running' | 'complete' | 'incomplete' | 'cancelled' | 'failed'

export interface RunEventEnvelope {
  id: number
  event: RunEvent
}

export interface RunSnapshot {
  runId: string
  status: RunStatus
  steps: number
  cap: number | null
  narration: string | null
  frameUrl: string | null
  costUsd: number
  tokensIn: number
  tokensOut: number
  lastEventId: number
  corrections: string[]
  recoverableErrors: string[]
  result?: RunResult
  failureReason?: string
}

export interface TerminalRun {
  runId: string
  instruction: string
  startedAt: number
  completedAt: number
  snapshot: RunSnapshot
  metrics: ManagedRunMetrics
}

export interface RegisterRun {
  runId: string
  instruction: string
  managedRun: ManagedRun
  onTerminal?: (run: TerminalRun) => void | Promise<void>
}

export interface RunRegistryOptions {
  now?: () => number
  retentionMs?: number
  onTerminal?: (run: TerminalRun) => void | Promise<void>
}

interface Subscriber {
  queue: RunEventEnvelope[]
  wake?: () => void
  done: boolean
}

interface StoredRun {
  runId: string
  instruction: string
  /**
   * The run itself, and what settles it, until the run has ended. A finished
   * run keeps only what replay and its snapshot need, so its upload and all
   * else it held go with it (#101).
   */
  managedRun?: ManagedRun
  onTerminal?: (run: TerminalRun) => void | Promise<void>
  startedAt: number
  terminalAt?: number
  /** Every event at its id, but a frame a newer one replaced leaves a gap (#101). */
  history: (RunEventEnvelope | undefined)[]
  latestFrame?: number
  snapshot: RunSnapshot
  subscribers: Set<Subscriber>
  cancelRequested: boolean
  finalized: boolean
  terminal: Promise<void>
  resolveTerminal: () => void
}

type LiveRun = StoredRun & { managedRun: ManagedRun }

function isLive(run: StoredRun): run is LiveRun {
  return !run.finalized && run.managedRun !== undefined
}

export class RunRegistryError extends Error {
  readonly code: 'run_not_found' | 'run_ended' | 'run_exists' | 'shutting_down'

  constructor(code: RunRegistryError['code'], message: string) {
    super(message)
    this.name = 'RunRegistryError'
    this.code = code
  }
}

function initialSnapshot(runId: string): RunSnapshot {
  return {
    runId,
    status: 'running',
    steps: 0,
    cap: null,
    narration: null,
    frameUrl: null,
    costUsd: 0,
    tokensIn: 0,
    tokensOut: 0,
    lastEventId: -1,
    corrections: [],
    recoverableErrors: []
  }
}

function copyResult(result: RunResult): RunResult {
  return { ...result, layers: cloneLayerTree(result.layers) }
}

function copySnapshot(snapshot: RunSnapshot): RunSnapshot {
  return {
    ...snapshot,
    corrections: [...snapshot.corrections],
    recoverableErrors: [...snapshot.recoverableErrors],
    result: snapshot.result && copyResult(snapshot.result)
  }
}

export class RunRegistry {
  readonly #runs = new Map<string, StoredRun>()
  readonly #now: () => number
  readonly #retentionMs: number
  readonly #onTerminal: (run: TerminalRun) => void | Promise<void>
  #closed = false

  constructor({
    now = () => Date.now(),
    retentionMs = DEFAULT_RETENTION_MS,
    onTerminal = () => undefined
  }: RunRegistryOptions = {}) {
    this.#now = now
    this.#retentionMs = retentionMs
    this.#onTerminal = onTerminal
  }

  register({ runId, instruction, managedRun, onTerminal }: RegisterRun): RunSnapshot {
    // A run registered once close() has begun would never be ended by it.
    if (this.#closed) {
      throw new RunRegistryError('shutting_down', 'The server is shutting down, so the run was not started.')
    }
    this.#purgeExpired()
    if (this.#runs.has(runId)) {
      throw new RunRegistryError('run_exists', 'A run with this id already exists.')
    }

    let resolveTerminal: () => void = () => {}
    const terminal = new Promise<void>((resolve) => {
      resolveTerminal = resolve
    })
    const run: StoredRun = {
      runId,
      instruction,
      managedRun,
      onTerminal,
      startedAt: this.#now(),
      history: [],
      snapshot: initialSnapshot(runId),
      subscribers: new Set(),
      cancelRequested: false,
      finalized: false,
      terminal,
      resolveTerminal
    }
    this.#runs.set(runId, run)
    void this.#pump(run, managedRun)
    return copySnapshot(run.snapshot)
  }

  async getSnapshot(runId: string): Promise<RunSnapshot | undefined> {
    this.#purgeExpired()
    const run = this.#runs.get(runId)
    return run && copySnapshot(run.snapshot)
  }

  async waitForTerminal(runId: string): Promise<void> {
    await this.#required(runId).terminal
  }

  async *events(runId: string, afterId = -1): AsyncIterable<RunEventEnvelope> {
    const run = this.#required(runId)
    const replayEnd = run.history.length - 1
    const subscriber: Subscriber = { queue: [], done: run.finalized }
    if (!run.finalized) run.subscribers.add(subscriber)

    try {
      for (const envelope of run.history) {
        if (envelope && envelope.id > afterId && envelope.id <= replayEnd) yield envelope
      }
      while (true) {
        while (subscriber.queue.length > 0) yield subscriber.queue.shift()!
        if (subscriber.done) return
        await new Promise<void>((resolve) => {
          subscriber.wake = resolve
        })
      }
    } finally {
      run.subscribers.delete(subscriber)
    }
  }

  async steer(runId: string, text: string): Promise<void> {
    const run = this.#requiredRunning(runId)
    try {
      await run.managedRun.handle.steer(text)
    } catch {
      // Contract 2 rejects a correction only once the run is ending.
      throw new RunRegistryError('run_ended', 'The run is finishing, so the correction was not applied.')
    }
  }

  async cancel(runId: string): Promise<void> {
    const run = this.#requiredRunning(runId)
    run.cancelRequested = true
    try {
      await run.managedRun.handle.cancel()
    } catch (error) {
      run.cancelRequested = false
      throw error
    }
  }

  /**
   * Ends every run still going, for shutdown, so none is left billing. Each is
   * cancelled and given `graceMs` to export and be recorded. One still going
   * then is abandoned, which releases its browser, and gets `graceMs` more.
   * Its secrets are released whether or not it has ended.
   */
  async close(graceMs = SHUTDOWN_GRACE_MS): Promise<void> {
    this.#closed = true
    const running = () => [...this.#runs.values()].filter(isLive)

    // Each phase is bounded as a whole, because a cancel or an abandon can
    // itself wait on a provider that has stopped answering.
    await within(
      Promise.all(
        running().map(async (run) => {
          run.cancelRequested = true
          try {
            await run.managedRun.handle.cancel()
          } catch {
            // The abandon below still stops the bill.
          }
          await run.terminal
        })
      ),
      graceMs
    )
    await within(
      Promise.all(
        running().map(async (run) => {
          await run.managedRun.abandon?.().catch(() => undefined)
          await run.terminal
        })
      ),
      graceMs
    )
    for (const run of running()) {
      try {
        run.managedRun.releaseSecrets()
      } catch {
        // Shutdown carries on.
      }
    }
  }

  async #pump(run: StoredRun, managedRun: ManagedRun): Promise<void> {
    try {
      for await (const incoming of managedRun.handle.events) {
        if (run.finalized) break
        const event: RunEvent = incoming.type === 'started' ? { ...incoming, runId: run.runId } : incoming
        this.#append(run, event)
        if (event.type === 'done' || (event.type === 'error' && !event.recoverable)) {
          await this.#finalize(run, managedRun)
          return
        }
      }
      if (!run.finalized) {
        this.#append(run, {
          type: 'error',
          reason: 'The run stopped unexpectedly.',
          recoverable: false
        })
        await this.#finalize(run, managedRun)
      }
    } catch {
      if (!run.finalized) {
        this.#append(run, {
          type: 'error',
          reason: 'The run stopped unexpectedly.',
          recoverable: false
        })
        await this.#finalize(run, managedRun)
      }
    }
  }

  #append(run: StoredRun, event: RunEvent): void {
    const envelope = { id: run.history.length, event }
    // The page shows only the latest frame, and each one kept would hold its
    // image as long as the run is kept, so a new frame replaces the last.
    if (event.type === 'frame') {
      if (run.latestFrame !== undefined) run.history[run.latestFrame] = undefined
      run.latestFrame = envelope.id
    }
    run.history.push(envelope)
    this.#reduce(run, event)
    run.snapshot.lastEventId = envelope.id
    for (const subscriber of run.subscribers) {
      // A slow reader's queue is this process's memory too, so an unread
      // frame is superseded the same way a replayed one is: at most one
      // waits here, and no non-frame event is ever dropped (#101).
      if (event.type === 'frame') {
        subscriber.queue = subscriber.queue.filter((queued) => queued.event.type !== 'frame')
      }
      subscriber.queue.push(envelope)
      subscriber.wake?.()
      subscriber.wake = undefined
    }
  }

  #reduce(run: StoredRun, event: RunEvent): void {
    const snapshot = run.snapshot
    switch (event.type) {
      case 'step':
        snapshot.steps = event.n
        snapshot.cap = event.cap
        snapshot.narration = event.narration
        break
      case 'frame':
        snapshot.frameUrl = event.pngUrl
        break
      case 'correction_ack':
        snapshot.corrections.push(event.text)
        break
      case 'cost':
        snapshot.costUsd = event.usd
        snapshot.tokensIn = event.tokensIn
        snapshot.tokensOut = event.tokensOut
        break
      case 'done':
        snapshot.result = copyResult(event.result)
        snapshot.status = run.cancelRequested ? 'cancelled' : event.result.complete ? 'complete' : 'incomplete'
        break
      case 'error':
        if (event.recoverable) snapshot.recoverableErrors.push(event.reason)
        else {
          snapshot.status = 'failed'
          snapshot.failureReason = event.reason
        }
        break
      case 'started':
        break
    }
  }

  async #finalize(run: StoredRun, managedRun: ManagedRun): Promise<void> {
    if (run.finalized) return
    run.finalized = true
    run.terminalAt = this.#now()
    for (const subscriber of run.subscribers) {
      subscriber.done = true
      subscriber.wake?.()
      subscriber.wake = undefined
    }

    let metrics: ManagedRunMetrics
    try {
      metrics = managedRun.metrics()
    } catch {
      metrics = { cacheHitRate: null, stopReason: 'failed' }
    }

    const terminalRun = {
      runId: run.runId,
      instruction: run.instruction,
      startedAt: run.startedAt,
      completedAt: run.terminalAt,
      snapshot: copySnapshot(run.snapshot),
      metrics
    }
    try {
      try {
        await run.onTerminal?.(terminalRun)
      } catch {
        // Reconciliation failures do not erase a completed run.
      }
      try {
        await this.#onTerminal(terminalRun)
      } catch {
        // Logging failures do not erase a completed run.
      }
    } finally {
      try {
        managedRun.releaseSecrets()
      } finally {
        run.managedRun = undefined
        run.onTerminal = undefined
        run.resolveTerminal()
      }
    }
  }

  #required(runId: string): StoredRun {
    this.#purgeExpired()
    const run = this.#runs.get(runId)
    if (!run) throw new RunRegistryError('run_not_found', 'The requested run does not exist.')
    return run
  }

  #requiredRunning(runId: string): LiveRun {
    const run = this.#required(runId)
    if (!isLive(run) || run.snapshot.status !== 'running') {
      throw new RunRegistryError('run_ended', 'The run has already ended.')
    }
    return run
  }

  #purgeExpired(): void {
    const now = this.#now()
    for (const [runId, run] of this.#runs) {
      if (run.terminalAt !== undefined && now - run.terminalAt >= this.#retentionMs) {
        this.#runs.delete(runId)
      }
    }
  }
}
