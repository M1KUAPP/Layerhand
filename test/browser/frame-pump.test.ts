import { describe, expect, test } from 'bun:test'
import { startFramePump, type FramePumpOptions } from '../../src/browser/frame-pump'

// A clock the test moves by hand. A pump waiting on it wakes when the test
// advances past the time it asked for, or when the pump is stopped.
class ManualClock {
  #now = 0
  #sleepers: { until: number; wake: () => void }[] = []

  now = () => this.#now

  sleep = (ms: number, signal: AbortSignal) =>
    new Promise<void>((wake) => {
      this.#sleepers.push({ until: this.#now + ms, wake })
      signal.addEventListener('abort', () => wake(), { once: true })
    })

  /** Moves time on without waking anyone, as a slow capture does. */
  pass(ms: number) {
    this.#now += ms
  }

  async advance(ms: number) {
    this.#now += ms
    const due = this.#sleepers.filter((sleeper) => sleeper.until <= this.#now)
    this.#sleepers = this.#sleepers.filter((sleeper) => sleeper.until > this.#now)
    for (const sleeper of due) sleeper.wake()
    await settle()
  }
}

// Lets the promises the pump is waiting on settle.
const settle = () => Bun.sleep(0)

// Frames that differ from each other, as frames of a changing editor do.
const numbered = () => {
  let n = 0
  return async () => new Uint8Array([++n])
}

function start(overrides: Partial<FramePumpOptions> & { clock?: ManualClock } = {}) {
  const { clock = new ManualClock(), ...options } = overrides
  const shown: string[] = []
  let missed = 0
  const pump = startFramePump({
    capture: numbered(),
    publish: async (frame) => `frame-${frame.join('.')}`,
    onFrame: (pngUrl) => shown.push(pngUrl),
    onMissedFrame: () => {
      missed += 1
    },
    intervalMs: 1000,
    now: clock.now,
    sleep: clock.sleep,
    ...options
  })
  return { clock, shown, missed: () => missed, stop: () => pump.stop() }
}

describe('startFramePump', () => {
  test('shows a frame as soon as it starts', async () => {
    const run = start()
    await settle()
    expect(run.shown).toEqual(['frame-1'])
    run.stop()
  })

  test('begins each capture one interval after the previous capture began', async () => {
    const clock = new ManualClock()
    const capture = numbered()
    let captures = 0
    const run = start({
      clock,
      capture: () => {
        captures += 1
        clock.pass(300)
        return capture()
      }
    })
    await settle()
    await clock.advance(699)
    expect(captures).toBe(1)
    await clock.advance(1)
    expect(captures).toBe(2)
    expect(run.shown).toEqual(['frame-1', 'frame-2'])
    run.stop()
  })

  test('captures again at once when a frame took longer than the interval', async () => {
    const clock = new ManualClock()
    const capture = numbered()
    let captures = 0
    const run = start({
      clock,
      capture: () => {
        captures += 1
        if (captures === 1) clock.pass(1500)
        return capture()
      }
    })
    await settle()
    expect(captures).toBe(2)
    expect(run.shown).toEqual(['frame-1', 'frame-2'])
    run.stop()
  })

  test('never starts a capture before the previous frame is finished', async () => {
    let finish!: (frame: Uint8Array) => void
    let captures = 0
    const run = start({
      capture: () => {
        captures += 1
        return new Promise((resolve) => {
          finish = resolve
        })
      }
    })
    await run.clock.advance(5000)
    expect(captures).toBe(1)
    finish(new Uint8Array([7]))
    await settle()
    expect(run.shown).toEqual(['frame-7'])
    expect(captures).toBe(2)
    run.stop()
  })

  test('skips a frame identical to the one on screen', async () => {
    const captures = [[1], [1], [2]]
    const published: string[] = []
    const run = start({
      capture: async () => new Uint8Array(captures.shift() ?? [2]),
      publish: async (frame) => {
        published.push(`frame-${frame.join('.')}`)
        return `frame-${frame.join('.')}`
      }
    })
    await settle()
    await run.clock.advance(1000)
    await run.clock.advance(1000)
    expect(published).toEqual(['frame-1', 'frame-2'])
    expect(run.shown).toEqual(['frame-1', 'frame-2'])
    run.stop()
  })

  test('publishes a frame again when the same frame failed to publish before', async () => {
    let attempts = 0
    const run = start({
      capture: async () => new Uint8Array([1]),
      publish: async (frame) => {
        attempts += 1
        if (attempts === 1) throw new Error('The bucket is unavailable')
        return `frame-${frame.join('.')}`
      }
    })
    await settle()
    await run.clock.advance(1000)
    expect(run.shown).toEqual(['frame-1'])
    run.stop()
  })

  test('keeps showing frames after a capture or a publish fails, and reports the failure once', async () => {
    let captures = 0
    const run = start({
      capture: async () => {
        captures += 1
        if (captures === 1) throw new Error('The browser is busy')
        return new Uint8Array([captures])
      },
      publish: async (frame) => {
        if (frame[0] === 3) throw new Error('The bucket is unavailable')
        return `frame-${frame.join('.')}`
      }
    })
    await settle()
    for (let tick = 0; tick < 3; tick++) await run.clock.advance(1000)
    expect(run.shown).toEqual(['frame-2', 'frame-4'])
    expect(run.missed()).toBe(1)
    run.stop()
  })

  test('captures nothing more once stopped, and never publishes the frame in progress', async () => {
    let finish!: (frame: Uint8Array) => void
    let captures = 0
    let publishes = 0
    const run = start({
      capture: () => {
        captures += 1
        return new Promise((resolve) => {
          finish = resolve
        })
      },
      publish: async (frame) => {
        publishes += 1
        return `frame-${frame.join('.')}`
      }
    })
    await settle()
    run.stop()
    finish(new Uint8Array([1]))
    await run.clock.advance(10_000)
    expect(captures).toBe(1)
    expect(publishes).toBe(0)
    expect(run.shown).toEqual([])
  })

  test('drops a frame whose publish finishes after the pump stopped', async () => {
    let finish!: (pngUrl: string) => void
    const run = start({
      publish: () =>
        new Promise<string>((resolve) => {
          finish = resolve
        })
    })
    await settle()
    run.stop()
    finish('frame-1')
    await settle()
    expect(run.shown).toEqual([])
  })

  test('reports nothing about a frame that fails after the pump stopped', async () => {
    let fail!: (error: Error) => void
    const run = start({
      publish: () =>
        new Promise<string>((_resolve, reject) => {
          fail = reject
        })
    })
    await settle()
    run.stop()
    fail(new Error('The bucket is unavailable'))
    await settle()
    expect(run.missed()).toBe(0)
  })

  test('resolves stop at once while it waits for the next frame', async () => {
    const run = start()
    await settle()
    let stopped = false
    void run.stop().then(() => {
      stopped = true
    })
    await settle()
    expect(stopped).toBe(true)
  })

  test('resolves stop once the frame in progress has settled', async () => {
    let finish!: (frame: Uint8Array) => void
    const run = start({
      capture: () =>
        new Promise((resolve) => {
          finish = resolve
        })
    })
    await settle()
    let stopped = false
    const stopping = run.stop().then(() => {
      stopped = true
    })
    await settle()
    expect(stopped).toBe(false)
    finish(new Uint8Array([1]))
    await stopping
    expect(run.shown).toEqual([])
  })

  test('resolves stop within a second even if the frame in progress never settles', async () => {
    const run = start({ capture: () => new Promise<Uint8Array>(() => {}) })
    await settle()
    let stopped = false
    void run.stop().then(() => {
      stopped = true
    })
    await run.clock.advance(999)
    expect(stopped).toBe(false)
    await run.clock.advance(1)
    expect(stopped).toBe(true)
  })

  test('keeps real time by default, and captures nothing once stopped', async () => {
    let captures = 0
    const capture = numbered()
    const pump = startFramePump({
      capture: () => {
        captures += 1
        return capture()
      },
      publish: async () => 'frame',
      onFrame: () => undefined,
      onMissedFrame: () => undefined,
      intervalMs: 20
    })
    for (let waited = 0; captures < 3 && waited < 1000; waited += 5) await Bun.sleep(5)
    expect(captures).toBeGreaterThanOrEqual(3)
    pump.stop()
    const stoppedAt = captures
    await Bun.sleep(60)
    expect(captures).toBe(stoppedAt)
  })
})
