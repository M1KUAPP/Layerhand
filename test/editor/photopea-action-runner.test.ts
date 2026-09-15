import { describe, expect, test } from 'bun:test'
import type { AuxiliaryMouse, PhotopeaActionPage } from '../../src/editor/photopea-action-runner'
import { PhotopeaActionRunner } from '../../src/editor/photopea-action-runner'

interface RecordingPage extends PhotopeaActionPage {
  readonly calls: string[]
  readonly captured: Buffer
}

function createRecordingPage(): RecordingPage {
  const calls: string[] = []
  const captured = Buffer.from([1, 2, 3])

  return {
    calls,
    captured,
    mouse: {
      click: async (x, y, options) => {
        calls.push(`mouse.click:${x},${y}:${options?.button ?? 'left'}:${options?.clickCount ?? 1}`)
      },
      down: async (options) => {
        calls.push(`mouse.down:${options?.button ?? 'left'}`)
      },
      move: async (x, y) => {
        calls.push(`mouse.move:${x},${y}`)
      },
      up: async (options) => {
        calls.push(`mouse.up:${options?.button ?? 'left'}`)
      },
      wheel: async (deltaX, deltaY) => {
        calls.push(`mouse.wheel:${deltaX},${deltaY}`)
      }
    },
    keyboard: {
      down: async (key) => {
        calls.push(`keyboard.down:${key}`)
      },
      insertText: async (text) => {
        calls.push(`keyboard.insertText:${text}`)
      },
      press: async (key) => {
        calls.push(`keyboard.press:${key}`)
      },
      up: async (key) => {
        calls.push(`keyboard.up:${key}`)
      }
    },
    screenshot: async (options) => {
      calls.push(`page.screenshot:${options.type}:${options.fullPage}`)
      return captured
    }
  }
}

function createRecordingAuxiliaryMouse(calls: string[]): AuxiliaryMouse {
  return {
    click: async (button, point, modifiers) => {
      calls.push(`auxiliary.click:${button}:${point.x},${point.y}:${modifiers.join('+')}`)
    },
    close: async () => {
      calls.push('auxiliary.close')
    }
  }
}

describe('Photopea action runner', () => {
  test('executes every computer action in semantic order', async () => {
    const page = createRecordingPage()
    const delays: number[] = []
    const runner = new PhotopeaActionRunner(page, createRecordingAuxiliaryMouse(page.calls), {
      delay: async (milliseconds) => {
        delays.push(milliseconds)
      }
    })

    await runner.act([
      { type: 'click', button: 'left', x: 10, y: 11, keys: ['shift'] },
      { type: 'click', button: 'wheel', x: 12, y: 13, keys: ['ctrl'] },
      { type: 'click', button: 'back', x: 14, y: 15, keys: ['alt'] },
      { type: 'click', button: 'forward', x: 16, y: 17, keys: ['cmd'] },
      { type: 'double_click', x: 18, y: 19, keys: ['meta'] },
      { type: 'move', x: 20, y: 21, keys: ['shift'] },
      {
        type: 'drag',
        path: [
          { x: 22, y: 23 },
          { x: 24, y: 25 },
          { x: 26, y: 27 }
        ],
        keys: ['shift', 'alt']
      },
      { type: 'drag', path: [] },
      { type: 'scroll', x: 28, y: 29, scroll_x: 30, scroll_y: 31, keys: ['control'] },
      { type: 'keypress', keys: ['ctrl', 'shift', 'a'] },
      { type: 'type', text: 'Layerhand' },
      { type: 'wait' },
      { type: 'screenshot' }
    ])

    expect(page.calls).toEqual([
      'keyboard.down:Shift',
      'mouse.click:10,11:left:1',
      'keyboard.up:Shift',
      'keyboard.down:Control',
      'mouse.click:12,13:middle:1',
      'keyboard.up:Control',
      'keyboard.down:Alt',
      'auxiliary.click:back:14,15:Alt',
      'keyboard.up:Alt',
      'keyboard.down:Meta',
      'auxiliary.click:forward:16,17:Meta',
      'keyboard.up:Meta',
      'keyboard.down:Meta',
      'mouse.click:18,19:left:2',
      'keyboard.up:Meta',
      'keyboard.down:Shift',
      'mouse.move:20,21',
      'keyboard.up:Shift',
      'keyboard.down:Shift',
      'keyboard.down:Alt',
      'mouse.move:22,23',
      'mouse.down:left',
      'mouse.move:24,25',
      'mouse.move:26,27',
      'mouse.up:left',
      'keyboard.up:Alt',
      'keyboard.up:Shift',
      'keyboard.down:Control',
      'mouse.move:28,29',
      'mouse.wheel:30,31',
      'keyboard.up:Control',
      'keyboard.press:Control+Shift+a',
      'keyboard.insertText:Layerhand',
      'page.screenshot:png:false'
    ])
    expect(delays).toEqual([1000])

    const screenshot = await runner.screenshot()
    page.captured[0] = 9
    expect(screenshot).toEqual(Uint8Array.of(1, 2, 3))
  })

  test('releases modifiers in reverse order when a mouse operation fails', async () => {
    const page = createRecordingPage()
    page.mouse.click = async () => {
      page.calls.push('mouse.click:failed')
      throw new Error('mouse failed')
    }
    const runner = new PhotopeaActionRunner(page, createRecordingAuxiliaryMouse(page.calls))

    await expect(runner.act([{ type: 'click', button: 'left', x: 10, y: 11, keys: ['shift', 'alt'] }])).rejects.toThrow(
      'mouse failed'
    )

    expect(page.calls).toEqual([
      'keyboard.down:Shift',
      'keyboard.down:Alt',
      'mouse.click:failed',
      'keyboard.up:Alt',
      'keyboard.up:Shift'
    ])
  })

  test('releases the mouse button when drag movement fails after pressing it', async () => {
    const page = createRecordingPage()
    page.mouse.move = async (x, y) => {
      page.calls.push(`mouse.move:${x},${y}`)
      if (x === 24) throw new Error('drag failed')
    }
    const runner = new PhotopeaActionRunner(page, createRecordingAuxiliaryMouse(page.calls))

    await expect(
      runner.act([
        {
          type: 'drag',
          path: [
            { x: 22, y: 23 },
            { x: 24, y: 25 }
          ]
        }
      ])
    ).rejects.toThrow('drag failed')

    expect(page.calls).toEqual(['mouse.move:22,23', 'mouse.down:left', 'mouse.move:24,25', 'mouse.up:left'])
  })

  test('does nothing for an empty drag even when modifiers are supplied', async () => {
    const page = createRecordingPage()
    const runner = new PhotopeaActionRunner(page, createRecordingAuxiliaryMouse(page.calls))

    await runner.act([{ type: 'drag', path: [], keys: ['shift'] }])

    expect(page.calls).toEqual([])
  })

  test('closes the auxiliary mouse once and shares its rejection', async () => {
    const page = createRecordingPage()
    const rejection = new Error('auxiliary close failed')
    let closes = 0
    const runner = new PhotopeaActionRunner(page, {
      click: async () => undefined,
      close: () => {
        closes += 1
        throw rejection
      }
    })

    const first = runner.close()
    const second = runner.close()

    await expect(first).rejects.toBe(rejection)
    await expect(second).rejects.toBe(rejection)
    expect(closes).toBe(1)
  })
})
