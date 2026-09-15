import type { Page } from 'playwright-core'
import { cloneLayerTree } from './layer-tree'
import { PhotopeaActionRunner } from './photopea-action-runner'
import { PhotopeaBridge } from './photopea-bridge'
import { PhotopeaDocumentExporter, type PhotopeaExportSnapshot } from './photopea-document-exporter'
import { PhotopeaDocumentLoader } from './photopea-document-loader'
import { PhotopeaExportError } from './photopea-export-error'
import { createPlaywrightAuxiliaryMouse } from './playwright-auxiliary-mouse'
import { PlaywrightPhotopeaTransport } from './playwright-photopea-transport'
import type { ComputerAction, EditorSession, LayerInfo, Viewport } from './session'

export interface PhotopeaEditorSessionDependencies {
  readonly id: string
  readonly viewport: Viewport
  readonly loader: Pick<PhotopeaDocumentLoader, 'open'>
  readonly exporter: Pick<PhotopeaDocumentExporter, 'nameSourceLayer' | 'exportSnapshot'>
  readonly actions: Pick<PhotopeaActionRunner, 'act' | 'screenshot' | 'close'>
  readonly release: () => Promise<void>
}

export class PhotopeaEditorSession implements EditorSession {
  readonly id: string
  readonly viewport: Viewport
  readonly #dependencies: PhotopeaEditorSessionDependencies
  #tail: Promise<unknown> = Promise.resolve()
  #state: 'idle' | 'open' = 'idle'
  #closing = false
  #poison: PhotopeaExportError | undefined
  #snapshot: Promise<PhotopeaExportSnapshot> | undefined
  #closePromise: Promise<void> | undefined

  constructor(dependencies: PhotopeaEditorSessionDependencies) {
    this.id = dependencies.id
    this.viewport = { ...dependencies.viewport }
    this.#dependencies = dependencies
  }

  open(image: Uint8Array, filename: string): Promise<void> {
    const bytes = new Uint8Array(image)
    this.#snapshot = undefined
    return this.#enqueue(async () => {
      this.#state = 'idle'
      await this.#dependencies.loader.open(bytes, filename)
      await this.#dependencies.exporter.nameSourceLayer()
      this.#state = 'open'
    })
  }

  act(actions: ComputerAction[]): Promise<void> {
    const copy = structuredClone(actions)
    this.#snapshot = undefined
    return this.#enqueue(() => {
      this.#assertOpen()
      return this.#dependencies.actions.act(copy)
    })
  }

  screenshot(): Promise<Uint8Array> {
    return this.#enqueue(async () => {
      this.#assertOpen()
      return new Uint8Array(await this.#dependencies.actions.screenshot())
    })
  }

  layers(): Promise<LayerInfo[]> {
    return this.#getSnapshot().then((snapshot) => cloneLayerTree(snapshot.layers))
  }

  exportPsd(): Promise<Uint8Array> {
    return this.#getSnapshot().then((snapshot) => new Uint8Array(snapshot.psd))
  }

  exportPreview(): Promise<Uint8Array> {
    return this.#getSnapshot().then((snapshot) => new Uint8Array(snapshot.preview))
  }

  close(): Promise<void> {
    if (this.#closePromise) return this.#closePromise
    this.#closing = true
    const tail = this.#tail
    this.#closePromise = (async () => {
      let failed = false
      let failure: unknown
      const attempt = async (operation: () => Promise<unknown>) => {
        try {
          await operation()
        } catch (error) {
          if (!failed) {
            failed = true
            failure = error
          }
        }
      }
      try {
        await attempt(() => tail)
        await attempt(() => this.#dependencies.actions.close())
      } finally {
        await attempt(() => this.#dependencies.release())
      }
      if (failed) throw failure
    })()
    return this.#closePromise
  }

  #getSnapshot(): Promise<PhotopeaExportSnapshot> {
    const rejection = this.#admissionError()
    if (rejection) return Promise.reject(rejection)
    return (this.#snapshot ??= this.#enqueue(async () => {
      this.#assertOpen()
      try {
        return await this.#dependencies.exporter.exportSnapshot()
      } catch (error) {
        // Invalidation cannot restore trust in an ambiguous protocol stream.
        if (error instanceof PhotopeaExportError && error.code === 'photopea_export_response') {
          this.#poison = error
        }
        throw error
      }
    }))
  }

  #assertOpen(): void {
    if (this.#state !== 'open') {
      throw new PhotopeaExportError('photopea_no_document', 'Photopea has no active document.')
    }
  }

  #admissionError(): Error | undefined {
    if (this.#closing) return new Error('Photopea editor session is closed.')
    return this.#poison
  }

  #enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const rejection = this.#admissionError()
    if (rejection) return Promise.reject(rejection)
    const run = () => {
      // Closing stops admission; accepted work must still drain. Poisoning
      // also stops accepted work because it can no longer trust the stream.
      if (this.#poison) throw this.#poison
      return operation()
    }
    const result = this.#tail.then(run, run)
    this.#tail = result
    return result
  }
}

export interface CreatePhotopeaEditorSessionOptions {
  readonly id: string
  readonly hostUrl: string
  readonly viewport?: Viewport
  readonly release: () => Promise<void>
  readonly commandTimeoutMs?: number
  readonly delay?: (milliseconds: number) => Promise<void>
}

export function createPhotopeaEditorSession(
  page: Page,
  options: CreatePhotopeaEditorSessionOptions
): PhotopeaEditorSession {
  const transport = new PlaywrightPhotopeaTransport(page, {
    hostUrl: options.hostUrl,
    ...(options.viewport === undefined ? {} : { viewport: options.viewport })
  })
  const bridge = new PhotopeaBridge(
    transport,
    options.commandTimeoutMs === undefined ? {} : { commandTimeoutMs: options.commandTimeoutMs }
  )
  const loader = new PhotopeaDocumentLoader(bridge)
  const exporter = new PhotopeaDocumentExporter(bridge)
  const auxiliaryMouse = createPlaywrightAuxiliaryMouse(page)
  const actions = new PhotopeaActionRunner(
    page,
    auxiliaryMouse,
    options.delay === undefined ? {} : { delay: options.delay }
  )
  return new PhotopeaEditorSession({
    id: options.id,
    viewport: transport.viewport,
    loader,
    exporter,
    actions,
    release: options.release
  })
}
