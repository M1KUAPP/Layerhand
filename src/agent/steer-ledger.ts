// The record of corrections sent as native steers (#9), and the single source
// of truth for whether each one reached the model natively or must be replayed
// at the step boundary. It holds no socket: the WebSocket adapter reports
// events to it, and the loop replays whatever it hands back.
//
// Each entry ends in exactly one terminal state. `applied` means native
// steering delivered it, so it is never replayed. `replayed` means it was
// handed back once for the next call. An outcome nothing can settle is
// replayed, because a correction applied twice is harmless and a lost one
// breaks FR-20.

export type SteerState = 'sent' | 'accepted' | 'pending' | 'applied' | 'replay' | 'replayed'

export interface SteerEntry {
  readonly text: string
  readonly parentResponseId: string
  readonly state: SteerState
}

export type Settlement = 'applied' | 'replay' | 'indeterminate'

interface Entry {
  text: string
  parentResponseId: string
  steerId?: string
  state: SteerState
}

const UNSETTLED = new Set<SteerState>(['sent', 'accepted', 'pending'])

export class SteerLedger {
  readonly #entries: Entry[] = []
  #nativeAvailable = true
  #indeterminate = 0

  /** False once the API has said this run cannot steer. */
  get nativeAvailable(): boolean {
    return this.#nativeAvailable
  }

  /** Settlements after a disconnect that stored evidence could not decide. */
  get indeterminate(): number {
    return this.#indeterminate
  }

  /** A `response.steer` was sent for the response in flight. Returns the entry's id. */
  sent(text: string, parentResponseId: string): number {
    return this.#entries.push({ text, parentResponseId, state: 'sent' }) - 1
  }

  /** One entry, by the id `sent` returned. */
  entry(id: number): SteerEntry {
    const { text, parentResponseId, state } = this.#entries[id]!
    return { text, parentResponseId, state }
  }

  /** Whether a steer on this parent was accepted and not yet applied or refused. */
  awaitingSuccessor(parentResponseId: string): boolean {
    return this.#entries.some((e) => e.parentResponseId === parentResponseId && e.state === 'accepted')
  }

  /** `response.steer.accepted`: steers are acknowledged in the order they were sent. */
  accepted(parentResponseId: string, steerId: string): void {
    const entry = this.#entries.find((e) => e.parentResponseId === parentResponseId && e.state === 'sent')
    if (!entry) return
    entry.state = 'accepted'
    entry.steerId = steerId
  }

  /** `response.steer.failed`: the steer will never be applied natively. */
  failed(failure: { steerId?: string; parentResponseId?: string; code: string }): void {
    if (failure.code === 'steering_not_supported') this.#nativeAvailable = false
    const entry = failure.steerId
      ? this.#entries.find((e) => e.steerId === failure.steerId && UNSETTLED.has(e.state))
      : this.#entries.find((e) => e.parentResponseId === failure.parentResponseId && e.state === 'sent')
    if (entry) entry.state = 'replay'
  }

  /** `response.steer.pending`: the server holds it until the tool output arrives. */
  pending(steerId: string): void {
    const entry = this.#entries.find((e) => e.steerId === steerId && e.state === 'accepted')
    if (entry) entry.state = 'pending'
  }

  /** The follow-on `response.created` for a steered parent: its accepted steers are applied. */
  successorCreated(parentResponseId: string): void {
    for (const entry of this.#entries) {
      if (entry.parentResponseId === parentResponseId && entry.state === 'accepted') entry.state = 'applied'
    }
  }

  /**
   * The `response.create` carrying the parent's tool output: the server
   * prepends the steers it still holds for that parent, whether or not it has
   * reported them pending yet.
   */
  continuationSent(parentResponseId: string): void {
    for (const entry of this.#entries) {
      if (entry.parentResponseId !== parentResponseId) continue
      if (entry.state === 'accepted' || entry.state === 'pending') entry.state = 'applied'
    }
  }

  /**
   * The `response.create` carrying the parent's tool output failed. The server
   * may have spent the steers it held for that parent on the response that
   * failed, so they are replayed with the call sent again.
   */
  continuationFailed(parentResponseId: string): void {
    for (const entry of this.#entries) {
      if (entry.parentResponseId !== parentResponseId) continue
      if (entry.state === 'accepted' || entry.state === 'pending') entry.state = 'replay'
    }
  }

  /**
   * The parent response completed normally. A steer on it that was neither
   * accepted nor refused never will be, so it is replayed. Accepted and
   * pending steers are left to their successor or continuation.
   */
  parentCompleted(parentResponseId: string): void {
    for (const entry of this.#entries) {
      if (entry.parentResponseId === parentResponseId && entry.state === 'sent') entry.state = 'replay'
    }
  }

  /** The socket dropped: `settle` decides every unsettled steer from stored responses. */
  disconnected(settle: (entry: SteerEntry) => Settlement): void {
    for (const entry of this.#entries) {
      if (!UNSETTLED.has(entry.state)) continue
      const settlement = settle({ text: entry.text, parentResponseId: entry.parentResponseId, state: entry.state })
      if (settlement === 'indeterminate') this.#indeterminate += 1
      entry.state = settlement === 'applied' ? 'applied' : 'replay'
    }
  }

  /** Hands back one steer for replay: true only the first time it is asked for after being settled for replay. */
  takeReplay(id: number): boolean {
    const entry = this.#entries[id]
    if (entry?.state !== 'replay') return false
    entry.state = 'replayed'
    return true
  }

  /** Hands back, once and in order, the steers the next call must carry as user messages. */
  takeReplays(): string[] {
    const replays = this.#entries.filter((e) => e.state === 'replay')
    for (const entry of replays) entry.state = 'replayed'
    return replays.map((e) => e.text)
  }

  /** Steers native steering delivered. */
  applied(): string[] {
    return this.#entries.filter((e) => e.state === 'applied').map((e) => e.text)
  }

  /** Steers not yet settled, or settled for replay but not yet handed back. */
  outstanding(): string[] {
    return this.#entries.filter((e) => UNSETTLED.has(e.state) || e.state === 'replay').map((e) => e.text)
  }
}
