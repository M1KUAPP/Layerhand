// The live view (FR-10): frames of the editor captured on a cadence of their
// own, apart from the screenshots the model sees, so the page keeps moving
// while the model thinks. docs/TRD.md § Frames explains the choice.

/** One frame a second, inside the one to two seconds FR-10 allows. */
export const FRAME_INTERVAL_MS = 1000

// The longest stop() waits for a frame in progress, so a stuck capture cannot hold up the caller.
const STOP_GRACE_MS = 1000

export interface FramePumpOptions {
  /** Takes a PNG of the editor. */
  capture(): Promise<Uint8Array>
  /** Stores a frame where the page can load it, and returns its URL. */
  publish(frame: Uint8Array): Promise<string>
  /** Receives the URL of each frame that reaches the page. */
  onFrame(pngUrl: string): void
  /** Called the first time a frame fails to reach the page. Later failures pass silently. */
  onMissedFrame(): void
  /** Milliseconds from the start of one capture to the start of the next. */
  intervalMs?: number
  now?(): number
  sleep?(ms: number, signal: AbortSignal): Promise<void>
}

export interface FramePump {
  /**
   * Stops capturing. Resolves once a frame in progress has settled, or after a
   * second if it has not. That frame never reaches the page.
   */
  stop(): Promise<void>
}

function sleepUnlessAborted(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((wake) => {
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      wake()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}

export function startFramePump({
  capture,
  publish,
  onFrame,
  onMissedFrame,
  intervalMs = FRAME_INTERVAL_MS,
  now = () => performance.now(),
  sleep = sleepUnlessAborted
}: FramePumpOptions): FramePump {
  const stopping = new AbortController()
  let onScreen: Uint8Array | undefined
  let reported = false

  const showNextFrame = async () => {
    const frame = await capture()
    // An editor waiting on the model usually looks the same from one second
    // to the next, and the page already shows it.
    if (stopping.signal.aborted || (onScreen && Buffer.compare(frame, onScreen) === 0)) return
    const pngUrl = await publish(frame)
    if (stopping.signal.aborted) return
    onScreen = frame
    onFrame(pngUrl)
  }

  const running = (async () => {
    while (!stopping.signal.aborted) {
      const startedAt = now()
      try {
        await showNextFrame()
      } catch {
        // A missed frame leaves the last one on the page; the run carries on.
        if (!stopping.signal.aborted && !reported) {
          reported = true
          onMissedFrame()
        }
      }
      const wait = startedAt + intervalMs - now()
      if (wait > 0 && !stopping.signal.aborted) await sleep(wait, stopping.signal)
    }
  })()

  return {
    async stop() {
      stopping.abort()
      // A run's handle can outlive the run, so the last frame is not kept with it.
      onScreen = undefined
      const grace = new AbortController()
      await Promise.race([running, sleep(STOP_GRACE_MS, grace.signal)])
      grace.abort()
    }
  }
}
