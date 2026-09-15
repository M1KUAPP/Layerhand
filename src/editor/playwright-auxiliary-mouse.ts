import type { Page } from 'playwright-core'
import type { AuxiliaryButton, AuxiliaryMouse } from './photopea-action-runner'
import type { Pt } from './session'

interface CdpSession {
  send(method: string, parameters?: object): Promise<unknown>
  detach(): Promise<void>
}

function modifierMask(modifiers: readonly string[]): number {
  let mask = 0
  for (const modifier of modifiers) {
    switch (modifier.toUpperCase()) {
      case 'ALT':
        mask |= 1
        break
      case 'CONTROL':
      case 'CTRL':
        mask |= 2
        break
      case 'META':
      case 'CMD':
      case 'COMMAND':
        mask |= 4
        break
      case 'SHIFT':
        mask |= 8
    }
  }
  return mask
}

function buttonState(button: AuxiliaryButton): number {
  return button === 'back' ? 8 : 16
}

export class PlaywrightAuxiliaryMouse implements AuxiliaryMouse {
  readonly #createSession: () => Promise<CdpSession>
  #session: Promise<CdpSession> | undefined
  #closePromise: Promise<void> | undefined

  constructor(page: Page, createSession: () => Promise<CdpSession> = () => page.context().newCDPSession(page)) {
    this.#createSession = createSession
  }

  async click(button: AuxiliaryButton, point: Pt, modifiers: readonly string[]): Promise<void> {
    const session = await this.#sessionForClick()
    const parameters = {
      x: point.x,
      y: point.y,
      button,
      clickCount: 1,
      modifiers: modifierMask(modifiers)
    }
    let pressed = false
    try {
      await session.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        ...parameters,
        buttons: buttonState(button)
      })
      pressed = true
    } finally {
      if (pressed) {
        await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...parameters, buttons: 0 })
      }
    }
  }

  close(): Promise<void> {
    return (this.#closePromise ??= this.#session?.then((session) => session.detach()) ?? Promise.resolve())
  }

  #sessionForClick(): Promise<CdpSession> {
    return (this.#session ??= this.#createSession())
  }
}

export function createPlaywrightAuxiliaryMouse(page: Page): AuxiliaryMouse {
  return new PlaywrightAuxiliaryMouse(page)
}
