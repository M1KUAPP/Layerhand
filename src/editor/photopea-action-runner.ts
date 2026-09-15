import type { Page } from 'playwright-core'
import type { ComputerAction, Pt } from './session'

export type AuxiliaryButton = 'back' | 'forward'

export interface AuxiliaryMouse {
  click(button: AuxiliaryButton, point: Pt, modifiers: readonly string[]): Promise<void>
  close(): Promise<void>
}

export interface PhotopeaActionPage {
  readonly mouse: Pick<Page['mouse'], 'click' | 'down' | 'move' | 'up' | 'wheel'>
  readonly keyboard: Pick<Page['keyboard'], 'down' | 'insertText' | 'press' | 'up'>
  screenshot(options: { readonly fullPage: false; readonly type: 'png' }): Promise<Buffer>
}

export interface PhotopeaActionRunnerOptions {
  readonly delay?: (milliseconds: number) => Promise<void>
}

const KEY_ALIASES = {
  SHIFT: 'Shift',
  CTRL: 'Control',
  CONTROL: 'Control',
  ALT: 'Alt',
  CMD: 'Meta',
  COMMAND: 'Meta',
  META: 'Meta',
  ENTER: 'Enter',
  ESC: 'Escape',
  ESCAPE: 'Escape',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ARROWUP: 'ArrowUp',
  ARROWDOWN: 'ArrowDown',
  ARROWLEFT: 'ArrowLeft',
  ARROWRIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGEUP: 'PageUp',
  PAGEDOWN: 'PageDown',
  TAB: 'Tab',
  SPACE: 'Space'
} as const

function normalizeKey(key: string): string {
  return KEY_ALIASES[key.toUpperCase() as keyof typeof KEY_ALIASES] ?? key
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export class PhotopeaActionRunner {
  readonly #page: PhotopeaActionPage
  readonly #auxiliaryMouse: AuxiliaryMouse
  readonly #delay: (milliseconds: number) => Promise<void>
  #closePromise: Promise<void> | undefined

  constructor(page: PhotopeaActionPage, auxiliaryMouse: AuxiliaryMouse, options: PhotopeaActionRunnerOptions = {}) {
    this.#page = page
    this.#auxiliaryMouse = auxiliaryMouse
    this.#delay = options.delay ?? delay
  }

  async act(actions: readonly ComputerAction[]): Promise<void> {
    for (const action of actions) {
      await this.#act(action)
    }
  }

  async screenshot(): Promise<Uint8Array> {
    const screenshot = await this.#page.screenshot({ fullPage: false, type: 'png' })
    return new Uint8Array(screenshot)
  }

  close(): Promise<void> {
    return (this.#closePromise ??= Promise.resolve().then(() => this.#auxiliaryMouse.close()))
  }

  async #act(action: ComputerAction): Promise<void> {
    switch (action.type) {
      case 'click':
        await this.#withModifiers(action.keys, async (modifiers) => {
          if (action.button === 'back' || action.button === 'forward') {
            await this.#auxiliaryMouse.click(action.button, action, modifiers)
            return
          }

          await this.#page.mouse.click(action.x, action.y, {
            button: action.button === 'wheel' ? 'middle' : action.button
          })
        })
        return
      case 'double_click':
        await this.#withModifiers(action.keys, async () => {
          await this.#page.mouse.click(action.x, action.y, { button: 'left', clickCount: 2 })
        })
        return
      case 'move':
        await this.#withModifiers(action.keys, async () => {
          await this.#page.mouse.move(action.x, action.y)
        })
        return
      case 'drag':
        if (action.path.length === 0) return
        await this.#withModifiers(action.keys, async () => {
          const [start, ...rest] = action.path

          await this.#page.mouse.move(start!.x, start!.y)
          await this.#page.mouse.down({ button: 'left' })
          try {
            for (const point of rest) {
              await this.#page.mouse.move(point.x, point.y)
            }
          } finally {
            await this.#page.mouse.up({ button: 'left' })
          }
        })
        return
      case 'scroll':
        await this.#withModifiers(action.keys, async () => {
          await this.#page.mouse.move(action.x, action.y)
          await this.#page.mouse.wheel(action.scroll_x, action.scroll_y)
        })
        return
      case 'keypress':
        await this.#page.keyboard.press(action.keys.map(normalizeKey).join('+'))
        return
      case 'type':
        await this.#page.keyboard.insertText(action.text)
        return
      case 'wait':
        await this.#delay(1000)
        return
      case 'screenshot':
        await this.#page.screenshot({ fullPage: false, type: 'png' })
    }
  }

  async #withModifiers(
    keys: readonly string[] | undefined,
    operation: (modifiers: readonly string[]) => Promise<void>
  ): Promise<void> {
    const pressed: string[] = []
    try {
      for (const key of keys ?? []) {
        const modifier = normalizeKey(key)
        await this.#page.keyboard.down(modifier)
        pressed.push(modifier)
      }
      await operation(pressed)
    } finally {
      for (const modifier of pressed.reverse()) {
        await this.#page.keyboard.up(modifier)
      }
    }
  }
}
