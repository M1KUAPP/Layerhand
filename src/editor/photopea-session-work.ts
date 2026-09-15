import type { PhotopeaExportSnapshot } from './photopea-document-exporter'

/** @internal Owns the session's queued work and lazy export cache. */
export class PhotopeaSessionWork {
  #tail: Promise<void> = Promise.resolve()
  #snapshot: Promise<PhotopeaExportSnapshot> | undefined

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#tail.then(operation, operation)
    this.#tail = result.then(() => undefined)
    // Keep rejection observable by drain without an unhandled shadow promise.
    void this.#tail.catch(() => undefined)
    return result
  }

  getSnapshot(create: () => Promise<PhotopeaExportSnapshot>): Promise<PhotopeaExportSnapshot> {
    return (this.#snapshot ??= create())
  }

  invalidateSnapshot(): void {
    this.#snapshot = undefined
  }

  drain(): Promise<void> {
    return this.#tail
  }

  clear(): void {
    this.#snapshot = undefined
    this.#tail = Promise.resolve()
  }
}
