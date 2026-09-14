import { readFile } from 'node:fs/promises'
import type { ComputerAction, EditorSession, LayerInfo, Viewport } from './session'

export interface EditorRecording {
  readonly frames: readonly Uint8Array[]
  readonly psd: Uint8Array
  readonly preview: Uint8Array
  readonly layers: readonly LayerInfo[]
}

type SessionState = 'idle' | 'open' | 'closed'

function cloneAction(action: ComputerAction): ComputerAction {
  switch (action.type) {
    case 'drag':
      return {
        ...action,
        path: action.path.map((point) => ({ ...point })),
        keys: action.keys?.slice()
      }
    case 'keypress':
      return { ...action, keys: action.keys.slice() }
    case 'click':
    case 'double_click':
    case 'move':
    case 'scroll':
      return { ...action, keys: action.keys?.slice() }
    case 'type':
    case 'wait':
    case 'screenshot':
      return { ...action }
  }
}

export class FakeEditorSession implements EditorSession {
  readonly id: string
  readonly viewport: Viewport

  readonly #recording: EditorRecording
  readonly #actionBatches: ComputerAction[][] = []
  #state: SessionState = 'idle'
  #frameIndex = 0
  #openedImage?: Uint8Array
  #openedFilename?: string

  constructor(options: { id: string; viewport: Viewport; recording: EditorRecording }) {
    if (options.recording.frames.length === 0) {
      throw new Error('Editor recording requires at least one frame')
    }

    this.id = options.id
    this.viewport = { ...options.viewport }
    this.#recording = {
      frames: options.recording.frames.map((frame) => frame.slice()),
      psd: options.recording.psd.slice(),
      preview: options.recording.preview.slice(),
      layers: options.recording.layers.map((layer) => ({ ...layer }))
    }
  }

  get openedImage(): Uint8Array | undefined {
    return this.#openedImage?.slice()
  }

  get openedFilename(): string | undefined {
    return this.#openedFilename
  }

  get actionBatches(): ComputerAction[][] {
    return this.#actionBatches.map((batch) => batch.map(cloneAction))
  }

  async open(image: Uint8Array, filename: string): Promise<void> {
    this.#ensureNotClosed()
    this.#openedImage = image.slice()
    this.#openedFilename = filename
    this.#frameIndex = 0
    this.#state = 'open'
  }

  async screenshot(): Promise<Uint8Array> {
    this.#ensureOpen()
    const index = Math.min(this.#frameIndex, this.#recording.frames.length - 1)
    const frame = this.#recording.frames[index]!
    this.#frameIndex += 1
    return frame.slice()
  }

  async act(actions: ComputerAction[]): Promise<void> {
    this.#ensureOpen()
    this.#actionBatches.push(actions.map(cloneAction))
  }

  async layers(): Promise<LayerInfo[]> {
    this.#ensureOpen()
    return this.#recording.layers.map((layer) => ({ ...layer }))
  }

  async exportPsd(): Promise<Uint8Array> {
    this.#ensureOpen()
    return this.#recording.psd.slice()
  }

  async exportPreview(): Promise<Uint8Array> {
    this.#ensureOpen()
    return this.#recording.preview.slice()
  }

  async close(): Promise<void> {
    this.#state = 'closed'
  }

  #ensureNotClosed(): void {
    if (this.#state === 'closed') {
      throw new Error('Editor session is closed')
    }
  }

  #ensureOpen(): void {
    this.#ensureNotClosed()
    if (this.#state !== 'open') {
      throw new Error('Editor session is not open')
    }
  }
}

export async function createRecordedFakeEditorSession(): Promise<FakeEditorSession> {
  const [frame, psd] = await Promise.all([
    readFile(new URL('./fixtures/photopea-frame.png', import.meta.url)),
    readFile(new URL('./fixtures/layered-output.psd', import.meta.url))
  ])

  return new FakeEditorSession({
    id: 'recorded-photopea-session',
    viewport: { width: 1440, height: 900 },
    recording: {
      frames: [frame],
      psd,
      preview: frame,
      layers: [
        { name: 'Original photograph', kind: 'raster', visible: true },
        { name: 'Retouched copy', kind: 'raster', visible: true }
      ]
    }
  })
}
