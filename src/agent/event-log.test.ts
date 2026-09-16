import { describe, expect, test } from 'bun:test'
import type { RunEvent } from './contract'
import { EventLog } from './event-log'

const frame = (n: number): RunEvent => ({ type: 'frame', pngUrl: `data:image/png;base64,frame-${n}` })
const step = (n: number): RunEvent => ({ type: 'step', n, cap: 40, narration: `Retouching, pass ${n}` })
const END: RunEvent = { type: 'error', reason: 'The run stopped because of an unexpected error', recoverable: false }

async function read(log: EventLog): Promise<RunEvent[]> {
  const events: RunEvent[] = []
  for await (const event of log) events.push(event)
  return events
}

describe('EventLog', () => {
  test('replays every event but only the latest frame, in its place', async () => {
    const log = new EventLog()
    for (let n = 1; n <= 3; n++) {
      log.emit(frame(n))
      log.emit(step(n))
    }
    log.end(END)

    expect(await read(log)).toEqual([step(1), step(2), frame(3), step(3), END])
  })

  test('gives a reader that keeps up every frame as it arrives', async () => {
    const log = new EventLog()
    const following = read(log)
    for (let n = 1; n <= 3; n++) {
      log.emit(frame(n))
      await Bun.sleep(0)
    }
    log.end(END)

    expect(await following).toEqual([frame(1), frame(2), frame(3), END])
  })
})
