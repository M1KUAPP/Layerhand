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
  /** Told about an action skipped because Playwright has no key by that name. */
  readonly onSkippedAction?: (action: ComputerAction, reason: string) => void
}

// Playwright's key names, looked up from the names the computer tool sends,
// which include X11 names such as Return, Down, and Page_Down.
const KEY_ALIASES = {
  SHIFT: 'Shift',
  SHIFT_L: 'Shift',
  SHIFT_R: 'Shift',
  CTRL: 'Control',
  CONTROL: 'Control',
  CONTROL_L: 'Control',
  CONTROL_R: 'Control',
  ALT: 'Alt',
  ALT_L: 'Alt',
  ALT_R: 'Alt',
  OPTION: 'Alt',
  CMD: 'Meta',
  COMMAND: 'Meta',
  META: 'Meta',
  SUPER: 'Meta',
  SUPER_L: 'Meta',
  SUPER_R: 'Meta',
  WIN: 'Meta',
  ENTER: 'Enter',
  RETURN: 'Enter',
  KP_ENTER: 'Enter',
  ESC: 'Escape',
  ESCAPE: 'Escape',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  DEL: 'Delete',
  INSERT: 'Insert',
  INS: 'Insert',
  ARROWUP: 'ArrowUp',
  ARROWDOWN: 'ArrowDown',
  ARROWLEFT: 'ArrowLeft',
  ARROWRIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGEUP: 'PageUp',
  PAGEDOWN: 'PageDown',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  PGUP: 'PageUp',
  PGDN: 'PageDown',
  PRIOR: 'PageUp',
  NEXT: 'PageDown',
  TAB: 'Tab',
  SPACE: 'Space',
  CAPS_LOCK: 'CapsLock',
  MINUS: 'Minus',
  EQUAL: 'Equal',
  PLUS: '+'
} as const

function normalizeKey(key: string): string {
  return KEY_ALIASES[key.toUpperCase() as keyof typeof KEY_ALIASES] ?? key
}

// Playwright's words for a key name it does not have.
const UNKNOWN_KEY = /Unknown key: .*/

function unknownKey(error: unknown): string | undefined {
  return error instanceof Error ? UNKNOWN_KEY.exec(error.message)?.[0] : undefined
}

function reportSkippedAction(action: ComputerAction, reason: string): void {
  process.stderr.write(`${JSON.stringify({ event: 'editor_action_skipped', action: action.type, reason })}\n`)
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export class PhotopeaActionRunner {
  readonly #page: PhotopeaActionPage
  readonly #auxiliaryMouse: AuxiliaryMouse
  readonly #delay: (milliseconds: number) => Promise<void>
  readonly #onSkippedAction: (action: ComputerAction, reason: string) => void
  #closePromise: Promise<void> | undefined

  constructor(page: PhotopeaActionPage, auxiliaryMouse: AuxiliaryMouse, options: PhotopeaActionRunnerOptions = {}) {
    this.#page = page
    this.#auxiliaryMouse = auxiliaryMouse
    this.#delay = options.delay ?? delay
    this.#onSkippedAction = options.onSkippedAction ?? reportSkippedAction
  }

  async act(actions: readonly ComputerAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.#act(action)
      } catch (error) {
        // A key Playwright cannot name skips that one action rather than ending
        // the run. The next screenshot shows the model nothing happened.
        const reason = unknownKey(error)
        if (reason === undefined) throw error
        this.#onSkippedAction(action, reason)
      }
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
      case 'keypress': {
        // Modifiers are held here rather than joined into one press, because a
        // press that fails on its last key would leave its modifiers held.
        const key = action.keys.at(-1)!
        await this.#withModifiers(action.keys.slice(0, -1), () => this.#page.keyboard.press(normalizeKey(key)))
        return
      }
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
    let failed = false
    let failure: unknown
    try {
      for (const key of keys ?? []) {
        const modifier = normalizeKey(key)
        await this.#page.keyboard.down(modifier)
        pressed.push(modifier)
      }
      await operation(pressed)
    } catch (error) {
      failed = true
      failure = error
    } finally {
      for (const modifier of pressed.reverse()) {
        try {
          await this.#page.keyboard.up(modifier)
        } catch (error) {
          if (!failed) {
            failed = true
            failure = error
          }
        }
      }
    }
    if (failed) throw failure
  }
}
