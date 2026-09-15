import { describe, expect, test } from 'bun:test'
import type { Page } from 'playwright-core'
import { PlaywrightAuxiliaryMouse } from '../../src/editor/playwright-auxiliary-mouse'

interface CdpEvent {
  readonly method: string
  readonly parameters: unknown
}

function createRecordingSession() {
  const events: CdpEvent[] = []
  let detachCount = 0

  return {
    events,
    get detachCount() {
      return detachCount
    },
    send: async (method: string, parameters: unknown) => {
      events.push({ method, parameters })
    },
    detach: async () => {
      detachCount += 1
    }
  }
}

describe('Playwright auxiliary mouse', () => {
  test('dispatches a back click with its CDP button state and modifiers', async () => {
    const session = createRecordingSession()
    const mouse = new PlaywrightAuxiliaryMouse(undefined as unknown as Page, async () => session)

    await mouse.click('back', { x: 40, y: 50 }, ['Alt', 'Control', 'Meta', 'Shift'])

    expect(session.events).toEqual([
      {
        method: 'Input.dispatchMouseEvent',
        parameters: {
          type: 'mousePressed',
          x: 40,
          y: 50,
          button: 'back',
          buttons: 8,
          clickCount: 1,
          modifiers: 15
        }
      },
      {
        method: 'Input.dispatchMouseEvent',
        parameters: {
          type: 'mouseReleased',
          x: 40,
          y: 50,
          button: 'back',
          buttons: 0,
          clickCount: 1,
          modifiers: 15
        }
      }
    ])
  })

  test('uses the forward button state and detaches one lazy session once', async () => {
    const session = createRecordingSession()
    const mouse = new PlaywrightAuxiliaryMouse(undefined as unknown as Page, async () => session)

    await mouse.click('forward', { x: 60, y: 70 }, [])
    await Promise.all([mouse.close(), mouse.close()])

    expect(session.events.map((event) => event.parameters)).toEqual([
      {
        type: 'mousePressed',
        x: 60,
        y: 70,
        button: 'forward',
        buttons: 16,
        clickCount: 1,
        modifiers: 0
      },
      {
        type: 'mouseReleased',
        x: 60,
        y: 70,
        button: 'forward',
        buttons: 0,
        clickCount: 1,
        modifiers: 0
      }
    ])
    expect(session.detachCount).toBe(1)
  })
})
