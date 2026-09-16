import type { RunEvent, RunResult, RunStopReason } from '../agent/contract'
import { cloneLayerTree } from '../editor/layer-tree'
import type { ManagedRun, ManagedRunMetrics } from './managed-run'

const DEFAULT_RETENTION_MS = 60 * 60 * 1000

// Cloud Run allows ten seconds after SIGTERM, which a cancel phase and an
// abandon phase of this length both fit inside.
const SHUTDOWN_GRACE_MS = 4_000

// A run ending or joining the queue tries the waiting runs again. This is for
// a run told to wait with nothing else in flight, as a free run can be while a
// crashed server's reservations run out.
const RETRY_WAITING_MS = 30_000

const LEFT_QUEUE = 'You left the queue before the run started.'
const SHUT_DOWN_IN_QUEUE = 'The server restarted before the run started. Start it again.'
const START_FAILED = 'The run could not be started. Try again in a moment.'

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

export type RunStatus = 'queued' | 'running' | 'complete' | 'incomplete' | 'cancelled' | 'failed'

/** What a run's event stream carries: Contract 2's events, and its place in the queue (Contract 3). */
export type RunStreamEvent = RunEvent | { type: 'queued'; position: number }

export interface RunEventEnvelope {
  id: number
  event: RunStreamEvent
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
  /** While the run waits for a slot, its place in line, counting from 1. */
  queuePosition?: number
  result?: RunResult
  failureReason?: string
  /**
   * Set alongside `result`: the true reason the run ended (step cap, spend
   * cap, time limit, shutdown, cancel, or that it completed).
   */
  stopReason?: RunStopReason
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

export interface EnqueueRun {
  runId: string
  instruction: string
  /**
   * Starts the run once it holds a slot. Resolves undefined when the run
   * cannot start yet, and it keeps its place to be tried again. Rejects with
   * RunStartRefused, whose message the visitor reads, when it never can.
   */
  start: () => Promise<ManagedRun | undefined>
  onTerminal?: (run: TerminalRun) => void | Promise<void>
}

export interface RunRegistryOptions {
  now?: () => number
  retentionMs?: number
  /** How many runs may be in flight at once; an enqueued run past it waits (NFR-4). Unbounded unless set. */
  maxConcurrentRuns?: number
  /** How long a run told to wait waits before it is tried again unprompted. */
  retryWaitingMs?: number
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
  /** What starts the run, while it waits in the queue. */
  start?: () => Promise<ManagedRun | undefined>
  /** Whether a start is in flight, which holds a slot until it settles. */
  starting: boolean
  /** Whether the run's last start said it cannot start yet. */
  toldToWait: boolean
  /** Whether the run is in flight and so counts against the cap. */
  holdsSlot: boolean
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
  readonly code: 'run_not_found' | 'run_ended' | 'run_exists' | 'run_queued' | 'shutting_down'

  constructor(code: RunRegistryError['code'], message: string) {
    super(message)
    this.name = 'RunRegistryError'
    this.code = code
  }
}

/** Why a queued run can never start. Its message is shown to the visitor, so it carries no provider detail. */
export class RunStartRefused extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RunStartRefused'
  }
}

function initialSnapshot(runId: string, status: RunStatus): RunSnapshot {
  return {
    runId,
    status,
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
  readonly #maxConcurrentRuns: number
  readonly #retryWaitingMs: number
  readonly #onTerminal: (run: TerminalRun) => void | Promise<void>
  /** Runs waiting for a slot, in the order they came. */
  readonly #queue: StoredRun[] = []
  #slotsInUse = 0
  #startPass: Promise<void> | undefined
  #startPassAgain = false
  #retryToldToWait = false
  #retryTimer: ReturnType<typeof setTimeout> | undefined
  #closed = false

  constructor({
    now = () => Date.now(),
    retentionMs = DEFAULT_RETENTION_MS,
    maxConcurrentRuns = Number.POSITIVE_INFINITY,
    retryWaitingMs = RETRY_WAITING_MS,
    onTerminal = () => undefined
  }: RunRegistryOptions = {}) {
    this.#now = now
    this.#retentionMs = retentionMs
    this.#maxConcurrentRuns = maxConcurrentRuns
    this.#retryWaitingMs = retryWaitingMs
    this.#onTerminal = onTerminal
  }

  /**
   * Registers a run that has already started. It takes a slot even past the
   * cap, because it is running either way; runs that can wait are enqueued.
   */
  register({ runId, instruction, managedRun, onTerminal }: RegisterRun): RunSnapshot {
    const run = this.#add(runId, instruction, onTerminal, 'running')
    this.#begin(run, managedRun)
    return copySnapshot(run.snapshot)
  }

  /**
   * Registers a run that starts once a slot is free: at once when one is and
   * no run waits ahead of it, and otherwise in first-in, first-out order,
   * with its place in line on its snapshot and event stream. Resolves once
   * the run has started, or taken its place.
   */
  async enqueue({ runId, instruction, start, onTerminal }: EnqueueRun): Promise<RunSnapshot> {
    const run = this.#add(runId, instruction, onTerminal, 'queued')
    run.start = start
    this.#queue.push(run)
    await this.#startWaiting()
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
    const waiting = this.#required(runId)
    if (waiting.snapshot.status === 'queued') {
      waiting.cancelRequested = true
      // A run whose start is in flight ends, or is cancelled, once that settles.
      if (!waiting.starting) await this.#endWaiting(waiting, LEFT_QUEUE)
      return
    }
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
    clearTimeout(this.#retryTimer)
    const running = () => [...this.#runs.values()].filter(isLive)
    // A waiting run never starts now. One whose start is in flight is
    // cancelled once that settles.
    for (const run of this.#queue) run.cancelRequested = true
    const waiting = this.#queue.filter((run) => !run.starting)

    // Each phase is bounded as a whole, because a cancel or an abandon can
    // itself wait on a provider that has stopped answering.
    await within(
      Promise.all([
        ...waiting.map((run) => this.#endWaiting(run, SHUT_DOWN_IN_QUEUE)),
        ...running().map(async (run) => {
          run.cancelRequested = true
          try {
            // Shutdown gets its own outcome (#112) when the managed run can tell it apart from a cancel.
            await (run.managedRun.shutdown ? run.managedRun.shutdown() : run.managedRun.handle.cancel())
          } catch {
            // The abandon below still stops the bill.
          }
          await run.terminal
        })
      ]),
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

  #add(
    runId: string,
    instruction: string,
    onTerminal: StoredRun['onTerminal'],
    status: 'queued' | 'running'
  ): StoredRun {
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
      onTerminal,
      starting: false,
      toldToWait: false,
      holdsSlot: false,
      startedAt: this.#now(),
      history: [],
      snapshot: initialSnapshot(runId, status),
      subscribers: new Set(),
      cancelRequested: false,
      finalized: false,
      terminal,
      resolveTerminal
    }
    this.#runs.set(runId, run)
    return run
  }

  #begin(run: StoredRun, managedRun: ManagedRun): void {
    run.managedRun = managedRun
    run.holdsSlot = true
    this.#slotsInUse += 1
    run.snapshot.status = 'running'
    void this.#pump(run, managedRun)
  }

  /**
   * Starts waiting runs in order while slots are free. One pass runs at a
   * time, and a pass asked for during one runs after it, so no run is missed.
   * A run told to wait is tried again only by a pass asked for with
   * `retryToldToWait`, when a run has ended or a while has passed.
   */
  #startWaiting(retryToldToWait = false): Promise<void> {
    this.#startPassAgain = true
    if (retryToldToWait) this.#retryToldToWait = true
    this.#startPass ??= (async () => {
      // Never settles synchronously, so the pass is stored before it clears itself.
      await undefined
      try {
        while (this.#startPassAgain) {
          this.#startPassAgain = false
          let retry = this.#retryToldToWait
          this.#retryToldToWait = false
          for (const run of [...this.#queue]) {
            if (this.#closed || this.#slotsInUse >= this.#maxConcurrentRuns) break
            // A run told to wait keeps its place, and the runs behind it may
            // still start: a free run waiting for reserved budget must not
            // hold up a run whose own reservation is what it waits for.
            if (!run.start || (run.toldToWait && !retry)) continue
            await this.#tryStart(run, run.start)
            // Runs behind one still told to wait would be told the same, and
            // must not go ahead of it, so they are not asked this time.
            if (run.toldToWait) retry = false
          }
        }
        this.#renumber()
      } finally {
        this.#startPass = undefined
        this.#retryLater()
      }
    })()
    return this.#startPass
  }

  async #tryStart(run: StoredRun, start: () => Promise<ManagedRun | undefined>): Promise<void> {
    // The slot is held while the start is in flight, so no other run takes it.
    this.#slotsInUse += 1
    run.starting = true
    let managedRun: ManagedRun | undefined
    let refusal: string | undefined
    try {
      managedRun = await start()
    } catch (error) {
      refusal = error instanceof RunStartRefused ? error.message : START_FAILED
    }
    run.starting = false
    run.toldToWait = !managedRun && refusal === undefined && !run.cancelRequested
    this.#slotsInUse -= 1

    if (managedRun) {
      this.#leaveQueue(run)
      this.#begin(run, managedRun)
      // A cancel or a shutdown that came while the run was starting still applies.
      if (run.cancelRequested) void managedRun.handle.cancel().catch(() => undefined)
    } else if (refusal !== undefined) {
      void this.#endWaiting(run, refusal)
    } else if (run.cancelRequested) {
      void this.#endWaiting(run, this.#closed ? SHUT_DOWN_IN_QUEUE : LEFT_QUEUE)
    }
  }

  /**
   * Ends a run that never started. The run log records it as cancelled when
   * that was asked for, and as failed otherwise.
   */
  async #endWaiting(run: StoredRun, reason: string): Promise<void> {
    if (run.finalized) return
    this.#leaveQueue(run)
    this.#append(run, { type: 'error', reason, recoverable: false })
    await this.#finalize(run, undefined)
  }

  #leaveQueue(run: StoredRun): void {
    const index = this.#queue.indexOf(run)
    if (index >= 0) this.#queue.splice(index, 1)
    run.start = undefined
    delete run.snapshot.queuePosition
  }

  /** Tells each waiting run whose place changed where it now stands. */
  #renumber(): void {
    this.#queue.forEach((run, index) => {
      if (run.snapshot.queuePosition !== index + 1) this.#append(run, { type: 'queued', position: index + 1 })
    })
  }

  /** A run told to wait while a slot is free is tried again later, in case nothing else prompts it. */
  #retryLater(): void {
    if (this.#closed || this.#retryTimer || this.#queue.length === 0) return
    if (this.#slotsInUse >= this.#maxConcurrentRuns) return
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = undefined
      void this.#startWaiting(true)
    }, this.#retryWaitingMs)
    this.#retryTimer.unref?.()
  }

  #append(run: StoredRun, event: RunStreamEvent): void {
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

  #reduce(run: StoredRun, event: RunStreamEvent): void {
    const snapshot = run.snapshot
    switch (event.type) {
      case 'queued':
        snapshot.queuePosition = event.position
        break
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
        snapshot.stopReason = event.result.stopReason
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

  /** Settles a run that has ended. `managedRun` is undefined for a run that never started. */
  async #finalize(run: StoredRun, managedRun: ManagedRun | undefined): Promise<void> {
    if (run.finalized) return
    run.finalized = true
    run.terminalAt = this.#now()
    for (const subscriber of run.subscribers) {
      subscriber.done = true
      subscriber.wake?.()
      subscriber.wake = undefined
    }

    let metrics: ManagedRunMetrics = { cacheHitRate: null, stopReason: 'failed' }
    if (!managedRun) {
      if (run.cancelRequested) metrics = { cacheHitRate: null, stopReason: 'cancelled' }
    } else {
      try {
        metrics = managedRun.metrics()
      } catch {
        // Counted as failed.
      }
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
        managedRun?.releaseSecrets()
      } finally {
        run.managedRun = undefined
        run.onTerminal = undefined
        run.start = undefined
        run.resolveTerminal()
        // The slot, or budget the run gave back when it was reconciled, may
        // be what a waiting run needs.
        if (run.holdsSlot) {
          run.holdsSlot = false
          this.#slotsInUse -= 1
        }
        void this.#startWaiting(true)
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
    if (run.snapshot.status === 'queued') {
      throw new RunRegistryError('run_queued', 'The run has not started yet, so the correction was not applied.')
    }
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
