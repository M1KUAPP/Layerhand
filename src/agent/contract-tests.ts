// Contract 2's tests, written once and run against every implementation of a
// run, so the fake and the real loop cannot drift apart. An implementation's
// own test file passes itself to testRunContract.
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type { RunEvent, RunHandle, RunRequest } from './contract'

export interface RunContractSubject {
  name: string
  /** A request the implementation can run. The tests change only its step cap. */
  request: RunRequest
  start(request: RunRequest): RunHandle | Promise<RunHandle>
  /** Starts a run that the implementation ends with an unrecoverable error. */
  startFailing(request: RunRequest): RunHandle | Promise<RunHandle>
  /** Per-test timeout, for implementations slower than the runner's default. */
  timeoutMs?: number
}

type EventOf<T extends RunEvent['type']> = Extract<RunEvent, { type: T }>

/** Reads a run's events until it ends, calling onEvent as each one arrives. */
export async function collect(handle: RunHandle, onEvent?: (event: RunEvent) => void): Promise<RunEvent[]> {
  const events: RunEvent[] = []
  for await (const event of handle.events) {
    events.push(event)
    onEvent?.(event)
  }
  return events
}

function ofType<T extends RunEvent['type']>(events: RunEvent[], type: T): EventOf<T>[] {
  return events.filter((event): event is EventOf<T> => event.type === type)
}

// A run ends exactly once, with done or an unrecoverable error, and nothing
// follows. Recoverable errors are reported along the way and do not end it.
function endOf<T extends 'done' | 'error'>(events: RunEvent[], type: T): EventOf<T> {
  const ends = events.filter((event) => event.type === 'done' || (event.type === 'error' && !event.recoverable))
  expect(ends).toHaveLength(1)
  expect(events.at(-1)).toBe(ends[0])
  expect(ends[0]?.type).toBe(type)
  return ends[0] as EventOf<T>
}

export function testRunContract(subject: RunContractSubject): void {
  const { request, timeoutMs } = subject
  const handles: RunHandle[] = []

  const track = async (starting: RunHandle | Promise<RunHandle>) => {
    const handle = await starting
    handles.push(handle)
    return handle
  }
  const start = (overrides: Partial<RunRequest> = {}) => track(subject.start({ ...request, ...overrides }))

  // A test that fails or times out must not leave its run going, paying for a
  // browser session and the model until the run ends by itself.
  const cancelAll = async () => {
    await Promise.allSettled(handles.splice(0).map(async (handle) => handle.cancel()))
  }

  describe(`${subject.name} keeps the run contract`, () => {
    afterEach(cancelAll, timeoutMs)
    afterAll(cancelAll, timeoutMs)

    describe('a run left to finish', () => {
      let events: RunEvent[] = []

      beforeAll(async () => {
        events = await collect(await start())
      }, timeoutMs)

      test('opens with its one started event', () => {
        const started = ofType(events, 'started')
        expect(started).toHaveLength(1)
        expect(events[0]).toBe(started[0])
        expect(started[0]?.runId).not.toBe('')
        expect(started[0]?.viewport.width).toBeGreaterThan(0)
        expect(started[0]?.viewport.height).toBeGreaterThan(0)
      })

      test('counts steps up from one against the requested cap', () => {
        const steps = ofType(events, 'step')
        expect(steps.length).toBeGreaterThan(0)
        expect(steps.length).toBeLessThanOrEqual(request.stepCap)
        steps.forEach((step, i) => {
          expect(step.n).toBe(i + 1)
          expect(step.cap).toBe(request.stepCap)
          expect(step.narration).not.toBe('')
        })
      })

      test('shows frames of the editor', () => {
        const frames = ofType(events, 'frame')
        expect(frames.length).toBeGreaterThan(0)
        for (const frame of frames) expect(frame.pngUrl).not.toBe('')
      })

      test('reports cost as a running total that never falls', () => {
        const costs = ofType(events, 'cost')
        expect(costs.length).toBeGreaterThan(0)
        costs.slice(1).forEach((cost, i) => {
          const previous = costs[i]!
          expect(cost.usd).toBeGreaterThanOrEqual(previous.usd)
          expect(cost.tokensIn).toBeGreaterThanOrEqual(previous.tokensIn)
          expect(cost.tokensOut).toBeGreaterThanOrEqual(previous.tokensOut)
        })
      })

      test('ends with a done event carrying the file and its layers', () => {
        const { result } = endOf(events, 'done')
        expect(result.psdUrl).not.toBe('')
        expect(result.previewUrl).not.toBe('')
        expect(result.layers.length).toBeGreaterThan(0)
      })
    })

    test(
      'replays the whole run to every subscriber',
      async () => {
        const handle = await start({ stepCap: 1 })
        let late: Promise<RunEvent[]> | undefined
        const events = await collect(handle, (event) => {
          if (event.type === 'step') late ??= collect(handle)
        })
        expect(await late).toEqual(events)
        expect(await collect(handle)).toEqual(events)
      },
      timeoutMs
    )

    test(
      'stops at the step cap with an incomplete result',
      async () => {
        const events = await collect(await start({ stepCap: 1 }))
        expect(ofType(events, 'step').map((step) => step.n)).toEqual([1])
        const { result } = endOf(events, 'done')
        expect(result.complete).toBe(false)
        expect(result.layers.length).toBeGreaterThan(0)
      },
      timeoutMs
    )

    test(
      'keeps the partial result when cancelled mid-run',
      async () => {
        const handle = await start()
        let cancelled: Promise<void> | undefined
        const events = await collect(handle, (event) => {
          if (event.type === 'step') cancelled ??= handle.cancel()
        })
        await cancelled
        const { result } = endOf(events, 'done')
        expect(result.complete).toBe(false)
        expect(result.layers.length).toBeGreaterThan(0)
      },
      timeoutMs
    )

    test(
      'ignores a cancel once the run has ended',
      async () => {
        const handle = await start({ stepCap: 1 })
        const events = await collect(handle)
        await handle.cancel()
        expect(await collect(handle)).toEqual(events)
      },
      timeoutMs
    )

    test(
      'acknowledges a correction within three seconds',
      async () => {
        const handle = await start()
        let sentAt = 0
        let steered: Promise<void> | undefined
        let cancelled: Promise<void> | undefined
        const events = await collect(handle, (event) => {
          if (event.type === 'step' && !steered) {
            sentAt = performance.now()
            steered = handle.steer('keep the shadow')
          }
          if (event.type === 'correction_ack') {
            expect(performance.now() - sentAt).toBeLessThan(3000)
            cancelled = handle.cancel()
          }
        })
        await Promise.all([steered, cancelled])
        expect(ofType(events, 'correction_ack')).toEqual([{ type: 'correction_ack', text: 'keep the shadow' }])
      },
      timeoutMs
    )

    test(
      'refuses a correction once the run has ended',
      async () => {
        const handle = await start({ stepCap: 1 })
        await collect(handle)
        await expect(handle.steer('too late')).rejects.toThrow()
      },
      timeoutMs
    )

    test(
      'ends a failed run with one unrecoverable error',
      async () => {
        const events = await collect(await track(subject.startFailing(request)))
        expect(endOf(events, 'error').reason).not.toBe('')
      },
      timeoutMs
    )
  })
}
