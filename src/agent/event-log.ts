// A run's events, kept so that each iteration replays the run from its first
// event and then follows it live, as contract 2 requires (FR-14).
import type { RunEvent } from './contract'

export class EventLog implements AsyncIterable<RunEvent> {
  readonly #events: RunEvent[] = []
  readonly #waiting: (() => void)[] = []
  #ended = false

  get ended(): boolean {
    return this.#ended
  }

  emit(event: RunEvent): void {
    this.#events.push(event)
    for (const wake of this.#waiting.splice(0)) wake()
  }

  /** Emits the run's last event, after which every iteration finishes. */
  end(event: RunEvent): void {
    this.#ended = true
    this.emit(event)
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<RunEvent> {
    for (let i = 0; ; i++) {
      while (i === this.#events.length) {
        if (this.#ended) return
        await new Promise<void>((wake) => this.#waiting.push(wake))
      }
      yield this.#events[i]!
    }
  }
}
