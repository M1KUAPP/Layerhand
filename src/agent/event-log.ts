// A run's events, kept so that each iteration replays the run from its first
// event and then follows it live, as contract 2 requires (FR-14). Only the
// latest frame is kept: the page shows no other, and every frame kept would
// hold its image for as long as the run is (#101).
import type { RunEvent } from './contract'

export class EventLog implements AsyncIterable<RunEvent> {
  // A frame a newer one replaces leaves a gap, so every iteration keeps its place.
  readonly #events: (RunEvent | undefined)[] = []
  readonly #waiting: (() => void)[] = []
  #latestFrame: number | undefined
  #ended = false

  get ended(): boolean {
    return this.#ended
  }

  emit(event: RunEvent): void {
    if (event.type === 'frame') {
      if (this.#latestFrame !== undefined) this.#events[this.#latestFrame] = undefined
      this.#latestFrame = this.#events.length
    }
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
      const event = this.#events[i]
      if (event) yield event
    }
  }
}
