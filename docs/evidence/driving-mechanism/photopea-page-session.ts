// A real EditorSession for spike A0: Photopea in a local Chromium page, driven
// by Playwright. A throwaway like the B1 probe, not the production adapter,
// which runs on the hosted browser provider.
import { readPsd, type Layer } from 'ag-psd'
import type { Page } from 'playwright-core'

import { PhotopeaBridge, PhotopeaDocumentLoader, PlaywrightPhotopeaTransport } from '../../../src/editor'
import type { ComputerAction, EditorSession, LayerInfo, Viewport } from '../../../src/editor/session'

const PSD_SIGNATURE = [0x38, 0x42, 0x50, 0x53]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47]

// The computer tool names keys in its own vocabulary; Playwright wants DOM key names.
const KEY_NAMES: Readonly<Record<string, string>> = {
  ALT: 'Alt',
  OPTION: 'Alt',
  CTRL: 'Control',
  CONTROL: 'Control',
  CMD: 'Meta',
  COMMAND: 'Meta',
  META: 'Meta',
  SUPER: 'Meta',
  WIN: 'Meta',
  SHIFT: 'Shift',
  ENTER: 'Enter',
  RETURN: 'Enter',
  ESC: 'Escape',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  SPACE: 'Space',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  DEL: 'Delete',
  UP: 'ArrowUp',
  ARROWUP: 'ArrowUp',
  DOWN: 'ArrowDown',
  ARROWDOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  ARROWLEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  ARROWRIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGEUP: 'PageUp',
  PAGEDOWN: 'PageDown'
}

export function playwrightKey(key: string): string {
  const named = KEY_NAMES[key.toUpperCase()]
  if (named) return named
  if (/^f\d{1,2}$/i.test(key)) return key.toUpperCase()
  return key.length === 1 ? key.toLowerCase() : key
}

function layerInfo(layers: readonly Layer[]): LayerInfo[] {
  return layers.flatMap((layer): LayerInfo[] => {
    const base = { name: layer.name ?? '', visible: !layer.hidden }
    if (layer.children) return [{ ...base, kind: 'group' }, ...layerInfo(layer.children)]
    if (layer.adjustment) return [{ ...base, kind: 'adjustment' }]
    return [{ ...base, kind: layer.mask ? 'mask' : 'raster' }]
  })
}

export class PhotopeaPageSession implements EditorSession {
  readonly id = crypto.randomUUID()
  readonly viewport: Viewport = { width: 1440, height: 900 }
  readonly #page: Page
  readonly #bridge: PhotopeaBridge
  // The loop exports the file and then lists its layers; one export serves both.
  #psd: Uint8Array | undefined

  constructor(page: Page, hostUrl: string) {
    this.#page = page
    const transport = new PlaywrightPhotopeaTransport(page, { hostUrl, viewport: this.viewport })
    // An exported file crosses the page boundary as an array of numbers, at seconds per megabyte.
    this.#bridge = new PhotopeaBridge(transport, { commandTimeoutMs: 300_000 })
  }

  async open(image: Uint8Array, filename: string): Promise<void> {
    this.#psd = undefined
    await new PhotopeaDocumentLoader(this.#bridge).open(image, filename)
  }

  async screenshot(): Promise<Uint8Array> {
    return new Uint8Array(await this.#page.screenshot({ type: 'png' }))
  }

  async act(actions: ComputerAction[]): Promise<void> {
    this.#psd = undefined
    for (const action of actions) await this.#perform(action)
  }

  async layers(): Promise<LayerInfo[]> {
    const psd = readPsd(Buffer.from(this.#psd ?? (await this.exportPsd())), {
      skipCompositeImageData: true,
      skipLayerImageData: true,
      skipThumbnail: true
    })
    return layerInfo(psd.children ?? [])
  }

  async exportPsd(): Promise<Uint8Array> {
    this.#psd = await this.#export('psd', PSD_SIGNATURE)
    return this.#psd
  }

  exportPreview(): Promise<Uint8Array> {
    return this.#export('png', PNG_SIGNATURE)
  }

  async close(): Promise<void> {
    await this.#page.close()
  }

  async #export(format: 'psd' | 'png', signature: number[]): Promise<Uint8Array> {
    const messages = await this.#bridge.runScript(`app.activeDocument.saveToOE("${format}");`)
    const file = messages.findLast(
      (message) => message.type === 'bytes' && signature.every((byte, index) => message.value[index] === byte)
    )
    if (file?.type !== 'bytes') throw new Error(`Photopea did not export a ${format} file`)
    return file.value
  }

  async #perform(action: ComputerAction): Promise<void> {
    const { mouse, keyboard } = this.#page
    const held = action.type === 'keypress' ? [] : ('keys' in action ? (action.keys ?? []) : []).map(playwrightKey)
    for (const key of held) await keyboard.down(key)
    try {
      switch (action.type) {
        case 'click':
          // The editor page has nowhere to go back or forward to. Throwing would fail the whole run.
          if (action.button === 'back' || action.button === 'forward') break
          await mouse.click(action.x, action.y, { button: action.button === 'wheel' ? 'middle' : action.button })
          break
        case 'double_click':
          await mouse.dblclick(action.x, action.y)
          break
        case 'move':
          await mouse.move(action.x, action.y)
          break
        case 'drag': {
          const [start, ...rest] = action.path
          await mouse.move(start!.x, start!.y)
          await mouse.down()
          for (const point of rest) await mouse.move(point.x, point.y, { steps: 5 })
          await mouse.up()
          break
        }
        case 'scroll':
          await mouse.move(action.x, action.y)
          await mouse.wheel(action.scroll_x, action.scroll_y)
          break
        case 'keypress':
          await keyboard.press(action.keys.map(playwrightKey).join('+'))
          break
        case 'type':
          await keyboard.type(action.text)
          break
        case 'wait':
          await this.#page.waitForTimeout(1_000)
          break
        case 'screenshot':
          break
      }
    } finally {
      for (const key of held.reverse()) await keyboard.up(key)
    }
  }
}
