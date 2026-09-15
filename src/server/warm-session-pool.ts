// Editor sessions warmed while the user types the instruction (#70). The
// twenty-one seconds a first frame takes are spent inside the browser
// session, so the only way to meet NFR-3 is to start paying them when the
// image arrives rather than when the button is pressed.
//
// A visitor holds at most one warm session, so a retried upload cannot double
// the browser bill, and a session nobody claims is released. A visitor is only
// a cookie and an address, which anyone can change, so the pool is bounded
// globally as well: past that bound an upload simply does not warm, and its
// run starts cold. Warming spends nothing on the model: it is the editor
// session and the open image, no more. The pool keeps the session, the
// visitor's key and the image's digest; it never holds the image itself.
import type { EditorSession } from '../editor/session'

/** How long a warm session waits to be claimed before it is released. */
export const WARM_SESSION_TTL_MS = 120_000

/**
 * How many sessions may be warm at once. Browserbase allows 25 at this tier
 * and NFR-4 wants 20 of them for runs, so warming takes a small share and
 * leaves the rest to runs that are actually spending.
 */
export const MAX_WARM_SESSIONS = 4

export interface WarmEditorSession extends EditorSession {
  /** Releases the browser at once, without waiting for editor work. */
  abandon(): Promise<void>
}

export interface WarmSessionPoolOptions {
  /** Creates the session a warm upload opens its image in. */
  create(): WarmEditorSession
  releaseAfterMs?: number
  /** The most that may be warm at once, across every visitor. */
  maxWarm?: number
  idGenerator?: () => string
  setTimer?: (run: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

interface Entry {
  uploadId: string
  visitorKey: string
  digest: string
  session: WarmEditorSession
  /** Resolves once the image is open, or rejects. Never unhandled. */
  opened: Promise<void>
  openFailed: boolean
  timer: ReturnType<typeof setTimeout>
}

export async function imageDigest(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer)
  return Buffer.from(digest).toString('hex')
}

/**
 * The claimed session, whose `open` is already under way. Opening the same
 * image again waits for the warm open rather than adding a second document.
 */
function claimed(entry: Entry): WarmEditorSession {
  const { session } = entry
  return {
    ...session,
    get id() {
      return session.id
    },
    get viewport() {
      return session.viewport
    },
    open: async (image, filename) => {
      if ((await imageDigest(image)) === entry.digest) return entry.opened
      return session.open(image, filename)
    },
    screenshot: () => session.screenshot(),
    act: (actions) => session.act(actions),
    layers: () => session.layers(),
    exportPsd: () => session.exportPsd(),
    exportPreview: () => session.exportPreview(),
    close: () => session.close(),
    abandon: () => session.abandon()
  }
}

export class WarmSessionPool {
  readonly #options: Required<Omit<WarmSessionPoolOptions, 'create'>> & { create(): WarmEditorSession }
  readonly #byUpload = new Map<string, Entry>()
  readonly #byVisitor = new Map<string, Entry>()
  #closed = false

  constructor(options: WarmSessionPoolOptions) {
    this.#options = {
      releaseAfterMs: WARM_SESSION_TTL_MS,
      maxWarm: MAX_WARM_SESSIONS,
      idGenerator: () => crypto.randomUUID(),
      setTimer: (run, ms) => setTimeout(run, ms),
      clearTimer: (timer) => clearTimeout(timer),
      ...options
    }
  }

  /** How many sessions are warm, for tests and for the run log. */
  get size(): number {
    return this.#byUpload.size
  }

  /**
   * Creates a session and starts opening the image in it. It returns as soon
   * as the session exists, because the open is what takes the time.
   */
  async warm(visitorKey: string, image: Uint8Array, filename: string): Promise<string | undefined> {
    if (this.#closed) return undefined
    const digest = await imageDigest(image)
    // One visitor, one billed session: a second upload replaces the first.
    await this.release(this.#byVisitor.get(visitorKey))
    // The bound is global because a visitor is only a cookie and an address.
    // Past it nothing is warmed, and those runs start cold rather than queue.
    if (this.#byUpload.size >= this.#options.maxWarm) return undefined
    const uploadId = this.#options.idGenerator()
    const session = this.#options.create()
    const entry: Entry = {
      uploadId,
      visitorKey,
      digest,
      session,
      opened: Promise.resolve(),
      openFailed: false,
      timer: this.#options.setTimer(() => void this.release(entry), this.#options.releaseAfterMs)
    }
    entry.opened = session.open(image, filename).catch((error: unknown) => {
      // A warm session that could not open its image is not handed to a run.
      entry.openFailed = true
      throw error
    })
    // Nothing awaits it until a run claims it, and an unclaimed rejection must not be unhandled.
    entry.opened.catch(() => undefined)
    this.#byUpload.set(uploadId, entry)
    this.#byVisitor.set(visitorKey, entry)
    return uploadId
  }

  /**
   * Hands the warm session to a run, once. The upload must belong to this
   * visitor and hold this image; anything else leaves the run to start cold.
   */
  claim(uploadId: string | undefined, visitorKey: string, digest: string): WarmEditorSession | undefined {
    if (!uploadId) return undefined
    const entry = this.#byUpload.get(uploadId)
    if (!entry || entry.visitorKey !== visitorKey || entry.digest !== digest || entry.openFailed) return undefined
    this.#forget(entry)
    return claimed(entry)
  }

  /** Releases one warm session, if it is still held. */
  async release(entry: Entry | undefined): Promise<void> {
    if (!entry || !this.#byUpload.has(entry.uploadId)) return
    this.#forget(entry)
    await entry.session.abandon().catch(() => undefined)
  }

  /** Releases every warm session, for shutdown, so none is left billing. */
  async close(): Promise<void> {
    this.#closed = true
    await Promise.all([...this.#byUpload.values()].map((entry) => this.release(entry)))
  }

  #forget(entry: Entry): void {
    this.#options.clearTimer(entry.timer)
    this.#byUpload.delete(entry.uploadId)
    if (this.#byVisitor.get(entry.visitorKey) === entry) this.#byVisitor.delete(entry.visitorKey)
  }
}
