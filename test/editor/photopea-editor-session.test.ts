import { describe, expect, spyOn, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import {
  PhotopeaEditorSession,
  createPhotopeaEditorSession,
  type PhotopeaEditorSessionDependencies
} from '../../src/editor/photopea-editor-session'
import { PhotopeaExportError } from '../../src/editor/photopea-export-error'
import { PhotopeaSessionWork } from '../../src/editor/photopea-session-work'
import type { PhotopeaExportSnapshot } from '../../src/editor/photopea-document-exporter'
import type { ComputerAction, EditorSession, LayerInfo } from '../../src/editor/session'
import type { Page } from 'playwright-core'
import { png } from './support/image-headers'

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function fixture() {
  const events: string[] = []
  const snapshot: PhotopeaExportSnapshot = {
    psd: new Uint8Array([56, 66, 80, 83, 1]),
    preview: new Uint8Array([137, 80, 78, 71, 2]),
    layers: [
      {
        name: 'Retouch',
        kind: 'group',
        visible: true,
        masks: [],
        children: [
          {
            name: 'Exposure',
            kind: 'adjustment',
            visible: true,
            masks: [{ kind: 'pixel', enabled: true }],
            children: []
          }
        ]
      }
    ]
  }
  const dependencies: PhotopeaEditorSessionDependencies = {
    id: 'session-1',
    viewport: { width: 1440, height: 900 },
    loader: {
      async open(_bytes, filename) {
        events.push(`open:${filename}`)
        return { filename, format: 'png', width: 1, height: 1, loadMs: 0 }
      }
    },
    exporter: {
      async nameSourceLayer() {
        events.push('name')
      },
      async exportSnapshot() {
        events.push('snapshot')
        return snapshot
      }
    },
    actions: {
      async act() {
        events.push('act')
      },
      async screenshot() {
        events.push('screenshot')
        return new Uint8Array([1, 2])
      },
      async close() {
        events.push('actions:close')
      }
    },
    async release() {
      events.push('release')
    }
  }
  return { events, snapshot, dependencies, session: new PhotopeaEditorSession(dependencies) }
}

function documentCalls(session: EditorSession): Promise<unknown>[] {
  return [session.act([]), session.screenshot(), session.layers(), session.exportPsd(), session.exportPreview()]
}

async function expectAllRejected(promises: Promise<unknown>[], error?: unknown) {
  const results = await Promise.allSettled(promises)
  for (const result of results) {
    expect(result.status).toBe('rejected')
    if (error !== undefined && result.status === 'rejected') expect(result.reason).toBe(error)
  }
}

// Capture the internal owner through its real drain operation, keeping the
// session's private fields and public dependency contract intact.
function closeWithWork(session: PhotopeaEditorSession) {
  let work: PhotopeaSessionWork | undefined
  const drain = PhotopeaSessionWork.prototype.drain
  const capture = spyOn(PhotopeaSessionWork.prototype, 'drain').mockImplementation(function (
    this: PhotopeaSessionWork
  ) {
    work = this
    return drain.call(this)
  })
  try {
    const closed = session.close()
    if (!work) throw new Error('Close did not drain admitted work')
    return { work, closed }
  } finally {
    capture.mockRestore()
  }
}

describe('PhotopeaEditorSession', () => {
  test('keeps typed screenshot results out of the stored queue tail before close finishes', async () => {
    const { session, dependencies } = fixture()
    const cleanup = deferred()
    dependencies.actions.close = () => cleanup.promise
    await session.open(new Uint8Array([1]), 'a.png')
    const screenshot = await session.screenshot()
    const { work, closed } = closeWithWork(session)
    try {
      expect(screenshot).toEqual(new Uint8Array([1, 2]))
      expect(await work.drain()).toBeUndefined()
    } finally {
      cleanup.resolve()
      await closed
    }
  })

  for (const failing of ['none', 'drain', 'cleanup', 'release'] as const) {
    test(`close releases its cached snapshot and settles its tail after ${failing === 'none' ? 'success' : `${failing} failure`}`, async () => {
      const { dependencies, snapshot } = fixture()
      const failure = new Error(failing)
      const gate = deferred<Uint8Array>()
      dependencies.actions.screenshot = () => gate.promise
      dependencies.actions.close = async () => {
        if (failing === 'cleanup') throw failure
      }
      const session = new PhotopeaEditorSession({
        ...dependencies,
        async release() {
          if (failing === 'release') throw failure
        }
      })
      await session.open(new Uint8Array([1]), 'a.png')
      await session.layers()
      const admitted = session.screenshot()
      const admittedResult = Promise.allSettled([admitted])
      const { work, closed } = closeWithWork(session)
      const closeResult = closed.then(
        () => undefined,
        (error: unknown) => error
      )
      if (failing === 'drain') gate.reject(failure)
      else gate.resolve(new Uint8Array([3, 4]))
      await admittedResult
      expect(await closeResult).toBe(failing === 'none' ? undefined : failure)

      const replacement = { ...snapshot, psd: new Uint8Array([9]) }
      expect(await work.getSnapshot(() => Promise.resolve(replacement))).toBe(replacement)
      expect(await work.drain()).toBeUndefined()
      expect(session.close()).toBe(closed)
    })
  }

  test('rejects document operations before open without invoking dependencies', async () => {
    const { session, events } = fixture()
    await expectAllRejected(documentCalls(session))
    expect(events).toEqual([])
    await expect(session.close()).rejects.toMatchObject({ code: 'photopea_no_document' })
  })

  test('loads then names the source before enabling queued document operations', async () => {
    const { session, dependencies, events } = fixture()
    const loaded = deferred()
    const naming = deferred()
    dependencies.loader.open = async () => {
      events.push('load:start')
      await loaded.promise
      events.push('load:end')
      return { filename: 'a.png', format: 'png', width: 1, height: 1, loadMs: 0 }
    }
    dependencies.exporter.nameSourceLayer = async () => {
      events.push('name:start')
      await naming.promise
      events.push('name:end')
    }
    const opened = session.open(new Uint8Array([1]), 'a.png')
    const acted = session.act([])
    await Promise.resolve()
    expect(events).toEqual(['load:start'])
    loaded.resolve()
    await loaded.promise
    await Promise.resolve()
    expect(events).toEqual(['load:start', 'load:end', 'name:start'])
    naming.resolve()
    await Promise.all([opened, acted])
    expect(events).toEqual(['load:start', 'load:end', 'name:start', 'name:end', 'act'])
    await session.close()
  })

  for (const step of ['load', 'name'] as const) {
    test(`failed ${step} leaves a previously open session idle and clears its snapshot`, async () => {
      const { session, dependencies, events } = fixture()
      await session.open(new Uint8Array([1]), 'first.png')
      await session.layers()
      const failure = new Error(step)
      if (step === 'load')
        dependencies.loader.open = async () => {
          throw failure
        }
      else
        dependencies.exporter.nameSourceLayer = async () => {
          throw failure
        }
      await expect(session.open(new Uint8Array([2]), 'second.png')).rejects.toBe(failure)
      await expectAllRejected(documentCalls(session))
      expect(events.filter((event) => event === 'snapshot')).toHaveLength(1)
      await session.close().catch(() => {})
    })
  }

  test('copies image bytes, filename, action arrays, keys, and drag points before admission', async () => {
    const { session, dependencies } = fixture()
    const blocker = deferred()
    const originalOpen = dependencies.loader.open
    let calls = 0
    let receivedBytes: Uint8Array | undefined
    let receivedName: string | undefined
    let receivedActions: readonly ComputerAction[] | undefined
    dependencies.loader.open = async (bytes, filename) => {
      if (calls++ === 0) await blocker.promise
      else {
        receivedBytes = bytes
        receivedName = filename
      }
      return originalOpen(bytes, filename)
    }
    dependencies.actions.act = async (actions) => {
      receivedActions = actions
    }
    const first = session.open(new Uint8Array([0]), 'block.png')
    const bytes = Buffer.from([1, 2, 3])
    let filename = 'original.png'
    const second = session.open(bytes, filename)
    const actions: ComputerAction[] = [{ type: 'drag', path: [{ x: 3, y: 4 }], keys: ['SHIFT'] }]
    const acted = session.act(actions)
    bytes.fill(9)
    filename = 'changed.png'
    const drag = actions[0] as Extract<ComputerAction, { type: 'drag' }>
    drag.path[0]!.x = 99
    drag.keys![0] = 'ALT'
    actions.push({ type: 'wait' })
    blocker.resolve()
    await Promise.all([first, second, acted])
    expect(Array.from(receivedBytes!)).toEqual([1, 2, 3])
    expect(receivedName).toBe('original.png')
    expect(receivedActions).toEqual([{ type: 'drag', path: [{ x: 3, y: 4 }], keys: ['SHIFT'] }])
    await session.close()
  })

  test('serializes overlapping open, action, screenshot, and snapshot in submission order', async () => {
    const { session, dependencies, events, snapshot } = fixture()
    const gates = [deferred(), deferred(), deferred(), deferred()]
    const started = gates.map(() => deferred())
    const originalOpen = dependencies.loader.open
    dependencies.loader.open = async (bytes, filename) => {
      events.push('load')
      started[0]!.resolve()
      await gates[0]!.promise
      return originalOpen(bytes, filename)
    }
    dependencies.actions.act = async () => {
      events.push('act')
      started[1]!.resolve()
      await gates[1]!.promise
    }
    dependencies.actions.screenshot = async () => {
      events.push('screenshot')
      started[2]!.resolve()
      await gates[2]!.promise
      return new Uint8Array([1])
    }
    dependencies.exporter.exportSnapshot = async () => {
      events.push('snapshot')
      started[3]!.resolve()
      await gates[3]!.promise
      return snapshot
    }
    const operations = [
      session.open(new Uint8Array([1]), 'a.png'),
      session.act([]),
      session.screenshot(),
      session.layers()
    ]
    const stages = [
      ['load'],
      ['load', 'open:a.png', 'name', 'act'],
      ['load', 'open:a.png', 'name', 'act', 'screenshot'],
      ['load', 'open:a.png', 'name', 'act', 'screenshot', 'snapshot']
    ]
    for (let i = 0; i < gates.length; i++) {
      await started[i]!.promise
      expect(events).toEqual(stages[i]!)
      gates[i]!.resolve()
    }
    await Promise.all(operations)
    await session.close()
  })

  test('does not serialize separate sessions', async () => {
    const first = fixture()
    const second = fixture()
    const gate = deferred()
    const original = first.dependencies.loader.open
    first.dependencies.loader.open = async (bytes, name) => {
      await gate.promise
      return original(bytes, name)
    }
    const opening = first.session.open(new Uint8Array([1]), 'first.png')
    await second.session.open(new Uint8Array([2]), 'second.png')
    await second.session.act([])
    expect(first.events).toEqual([])
    expect(second.events).toEqual(['open:second.png', 'name', 'act'])
    gate.resolve()
    await opening
    await Promise.all([first.session.close(), second.session.close()])
  })

  test('close rejects new admissions immediately but drains all accepted work before cleanup and release', async () => {
    const { session, dependencies, events } = fixture()
    const load = deferred()
    const cleanup = deferred()
    const cleanupStarted = deferred()
    const original = dependencies.loader.open
    dependencies.loader.open = async (bytes, name) => {
      await load.promise
      return original(bytes, name)
    }
    dependencies.actions.close = async () => {
      events.push('actions:close')
      cleanupStarted.resolve()
      await cleanup.promise
    }
    const opening = session.open(new Uint8Array([1]), 'a.png')
    const acting = session.act([])
    const screenshot = session.screenshot()
    const layers = session.layers()
    const close = session.close()
    expect(session.close()).toBe(close)
    await expectAllRejected([session.open(new Uint8Array([2]), 'late.png'), ...documentCalls(session)])
    expect(events).toEqual([])
    load.resolve()
    await Promise.all([opening, acting, screenshot, layers, cleanupStarted.promise])
    expect(events).toEqual(['open:a.png', 'name', 'act', 'screenshot', 'snapshot', 'actions:close'])
    cleanup.resolve()
    await close
    expect(session.close()).toBe(close)
    await session.close()
    expect(events.at(-1)).toBe('release')
    expect(events.filter((event) => event === 'release')).toHaveLength(1)
  })

  for (const failing of ['drain', 'cleanup', 'release'] as const) {
    test(`close retains its first ${failing} failure and still releases once`, async () => {
      const { dependencies, events } = fixture()
      const failure = new Error(failing)
      const cleanupFailure = new Error('later cleanup')
      const releaseFailure = new Error('later release')
      const gate = deferred()
      dependencies.actions.act = async () => {
        await gate.promise
        if (failing === 'drain') throw failure
      }
      dependencies.actions.close = async () => {
        events.push('actions:close')
        if (failing !== 'release') throw failing === 'cleanup' ? failure : cleanupFailure
      }
      const sessionWithRelease = new PhotopeaEditorSession({
        ...dependencies,
        async release() {
          events.push('release')
          throw failing === 'release' ? failure : releaseFailure
        }
      })
      await sessionWithRelease.open(new Uint8Array([1]), 'a.png')
      const act = sessionWithRelease.act([])
      const actSettled = Promise.allSettled([act])
      const close = sessionWithRelease.close()
      expect(sessionWithRelease.close()).toBe(close)
      const closed = close.then(
        () => ({ status: 'resolved' }),
        (reason: unknown) => ({ status: 'rejected', reason })
      )
      gate.resolve()
      await actSettled
      expect(await closed).toEqual({ status: 'rejected', reason: failure })
      expect(sessionWithRelease.close()).toBe(close)
      await expect(sessionWithRelease.close()).rejects.toBe(failure)
      expect(events.slice(-2)).toEqual(['actions:close', 'release'])
      expect(events.filter((event) => event === 'release')).toHaveLength(1)
    })
  }

  test('a rejected action does not stall a later admitted screenshot', async () => {
    const { session, dependencies, events } = fixture()
    await session.open(new Uint8Array([1]), 'a.png')
    dependencies.actions.act = async () => {
      throw new Error('action')
    }
    const acted = session.act([])
    const screenshot = session.screenshot()
    await expect(acted).rejects.toThrow('action')
    expect(Array.from(await screenshot)).toEqual([1, 2])
    expect(events.at(-1)).toBe('screenshot')
    await session.close()
  })

  test('concurrent result methods share one snapshot and return deep defensive copies', async () => {
    const { session, dependencies, snapshot, events } = fixture()
    await session.open(new Uint8Array([1]), 'a.png')
    const gate = deferred<PhotopeaExportSnapshot>()
    const started = deferred()
    dependencies.exporter.exportSnapshot = async () => {
      events.push('snapshot')
      started.resolve()
      return gate.promise
    }
    const results = [session.layers(), session.exportPsd(), session.exportPreview()] as const
    await started.promise
    expect(events.filter((event) => event === 'snapshot')).toHaveLength(1)
    gate.resolve(snapshot)
    const [layers, psd, preview] = await Promise.all(results)
    const mutable = layers as unknown as { name: string; children: { masks: { enabled: boolean }[] }[] }[]
    mutable[0]!.name = 'changed'
    mutable[0]!.children[0]!.masks[0]!.enabled = false
    layers.push({ name: 'extra', kind: 'raster', visible: true, masks: [], children: [] })
    psd.fill(0)
    preview.fill(0)
    expect(await session.layers()).toEqual(snapshot.layers as LayerInfo[])
    expect(Array.from(await session.exportPsd())).toEqual([56, 66, 80, 83, 1])
    expect(Array.from(await session.exportPreview())).toEqual([137, 80, 78, 71, 2])
    expect(events.filter((event) => event === 'snapshot')).toHaveLength(1)
    await session.close()
  })

  test('screenshot preserves the snapshot cache', async () => {
    const { session, events } = fixture()
    await session.open(new Uint8Array([1]), 'a.png')
    await session.layers()
    await session.screenshot()
    await session.exportPreview()
    expect(events).toEqual(['open:a.png', 'name', 'snapshot', 'screenshot'])
    await session.close()
  })

  for (const operation of ['open', 'act'] as const) {
    test(`an attempted ${operation} invalidates synchronously before its dependency begins`, async () => {
      const { session, dependencies, events } = fixture()
      await session.open(new Uint8Array([1]), 'a.png')
      await session.layers()
      const gate = deferred<Uint8Array>()
      dependencies.actions.screenshot = () => gate.promise
      const blocker = session.screenshot()
      const attempted = operation === 'open' ? session.open(new Uint8Array([2]), 'b.png') : session.act([])
      const next = session.layers()
      let settled = false
      void next.then(() => {
        settled = true
      })
      await Promise.resolve()
      await Promise.resolve()
      expect(settled).toBe(false)
      expect(events).toEqual(['open:a.png', 'name', 'snapshot'])
      gate.resolve(new Uint8Array([1]))
      await Promise.all([blocker, attempted, next])
      expect(events.filter((event) => event === 'snapshot')).toHaveLength(2)
      await session.close()
    })
  }

  test('failed actions invalidate the cache and allow a new snapshot', async () => {
    const { session, dependencies, events } = fixture()
    await session.open(new Uint8Array([1]), 'a.png')
    await session.layers()
    dependencies.actions.act = async () => {
      throw new Error('action failed')
    }
    await expect(session.act([])).rejects.toThrow('action failed')
    await session.exportPsd()
    expect(events.filter((event) => event === 'snapshot')).toHaveLength(2)
    await session.close()
  })

  test('rejected snapshot stays cached until an action invalidates it', async () => {
    const { session, dependencies, events, snapshot } = fixture()
    await session.open(new Uint8Array([1]), 'a.png')
    const failure = new PhotopeaExportError('photopea_invalid_psd', 'bad PSD')
    dependencies.exporter.exportSnapshot = async () => {
      events.push('snapshot')
      throw failure
    }
    await expect(session.layers()).rejects.toBe(failure)
    await expectAllRejected([session.layers(), session.exportPsd(), session.exportPreview()], failure)
    await session.screenshot()
    await expect(session.layers()).rejects.toBe(failure)
    expect(events.filter((event) => event === 'snapshot')).toHaveLength(1)
    dependencies.exporter.exportSnapshot = async () => {
      events.push('snapshot')
      return snapshot
    }
    await session.act([])
    await session.layers()
    expect(events.filter((event) => event === 'snapshot')).toHaveLength(2)
    await session.close()
  })

  test('an older snapshot rejection cannot clear a newer retained snapshot', async () => {
    const { session, dependencies, events, snapshot } = fixture()
    await session.open(new Uint8Array([1]), 'a.png')
    const first = deferred<PhotopeaExportSnapshot>()
    let exports = 0
    dependencies.exporter.exportSnapshot = async () => {
      events.push('snapshot')
      if (exports++ === 0) return first.promise
      return snapshot
    }
    const old = session.layers()
    const oldResult = Promise.allSettled([old])
    const action = session.act([])
    const next = session.exportPsd()
    first.reject(new PhotopeaExportError('photopea_invalid_psd', 'invalid'))
    await oldResult
    await action
    await next
    await session.layers()
    expect(events.filter((event) => event === 'snapshot')).toHaveLength(2)
    await session.close()
  })

  test('ambiguous export response poisons later admissions and already queued document work', async () => {
    const { session, dependencies, events } = fixture()
    await session.open(new Uint8Array([1]), 'a.png')
    const gate = deferred<PhotopeaExportSnapshot>()
    const failure = new PhotopeaExportError('photopea_export_response', 'ambiguous')
    dependencies.exporter.exportSnapshot = () => gate.promise
    const snapshot = session.layers()
    const queued = [session.act([]), session.open(new Uint8Array([2]), 'b.png'), session.screenshot()]
    const allRejected = expectAllRejected([snapshot, ...queued], failure)
    gate.reject(failure)
    await allRejected
    await expectAllRejected([session.open(new Uint8Array([3]), 'c.png'), ...documentCalls(session)], failure)
    expect(events).toEqual(['open:a.png', 'name'])
    await session.close().catch(() => {})
    expect(events.slice(-2)).toEqual(['actions:close', 'release'])
  })

  test('ambiguous source naming poisons queued and newly admitted document work', async () => {
    const { session, dependencies, events } = fixture()
    const naming = deferred()
    const namingStarted = deferred()
    const failure = new PhotopeaExportError('photopea_export_response', 'ambiguous source naming')
    let names = 0
    dependencies.exporter.nameSourceLayer = async () => {
      events.push('name')
      if (names++ === 0) {
        namingStarted.resolve()
        await naming.promise
      }
    }
    const first = session.open(new Uint8Array([1]), 'first.png')
    await namingStarted.promise
    const queued = [session.open(new Uint8Array([2]), 'queued.png'), ...documentCalls(session)]
    const queuedResults = Promise.allSettled([first, ...queued])
    naming.reject(failure)
    const results = await queuedResults
    const admittedResults = await Promise.allSettled([
      session.open(new Uint8Array([3]), 'later.png'),
      ...documentCalls(session)
    ])
    const closeResult = await session.close().then(
      () => undefined,
      (error: unknown) => error
    )
    expect(results.map((result) => result.status)).toEqual(Array(7).fill('rejected'))
    expect(admittedResults.map((result) => result.status)).toEqual(Array(6).fill('rejected'))
    for (const result of [...results, ...admittedResults]) {
      if (result.status === 'rejected') expect(result.reason).toBe(failure)
    }
    expect(closeResult).toBe(failure)
    expect(events).toEqual(['open:first.png', 'name', 'actions:close', 'release'])
  })

  test('an error with an ambiguous-response-shaped code does not poison the session', async () => {
    const { session, dependencies } = fixture()
    await session.open(new Uint8Array([1]), 'a.png')
    const failure = { code: 'photopea_export_response' }
    dependencies.exporter.exportSnapshot = async () => {
      throw failure
    }
    await expect(session.layers()).rejects.toBe(failure)
    await session.act([])
    await session.screenshot()
    await session.close()
  })
})

describe('createPhotopeaEditorSession', () => {
  test('composes real loading and actions with viewport, timeout, delay, and ordered CDP release', async () => {
    const events: string[] = []
    const timeouts: number[] = []
    const messages: { type: 'text'; value: string }[] = []
    const document = { name: '', source: '', width: 1, height: 1, activeLayer: { name: 'Background' } }
    const app = {
      documents: [] as (typeof document)[],
      activeDocument: document,
      UI: { fitTheArea() {} },
      echoToOE(value: string) {
        messages.push({ type: 'text', value })
      }
    }
    const host = {
      Uint8Array,
      atob,
      window: {
        __layerhandPhotopeaMessages: messages,
        __layerhandSendToPhotopea(message: { type: string; value: string }) {
          if (message.type === 'bytes') app.documents.push(document)
          else runInNewContext(message.value, { app })
        }
      }
    }
    const page = {
      async setViewportSize(viewport: { width: number; height: number }) {
        events.push(`viewport:${viewport.width}x${viewport.height}`)
      },
      async goto(url: string) {
        events.push(`goto:${new URL(url).origin}${new URL(url).pathname}`)
        messages.push({ type: 'text', value: 'done' })
        return {}
      },
      async evaluate(callback: Function, argument?: unknown) {
        return runInNewContext(`(${callback.toString()})(argument)`, { ...host, argument })
      },
      async waitForFunction(callback: Function, argument: unknown, options: { timeout: number }) {
        timeouts.push(options.timeout)
        if (!runInNewContext(`(${callback.toString()})(argument)`, { ...host, argument })) throw new Error('timeout')
        return { async dispose() {} }
      },
      keyboard: {
        async press(key: string) {
          events.push(`press:${key}`)
        }
      },
      async screenshot() {
        return Buffer.from([1, 2, 3])
      },
      context() {
        return {
          async newCDPSession() {
            events.push('cdp:create')
            return {
              async send(_method: string, parameters: { type: string }) {
                events.push(parameters.type)
              },
              async detach() {
                events.push('cdp:detach')
              }
            }
          }
        }
      }
    }
    const viewport = { width: 1280, height: 720 }
    const session = createPhotopeaEditorSession(page as unknown as Page, {
      id: 'production',
      hostUrl: 'https://example.test/editor',
      viewport,
      commandTimeoutMs: 4321,
      async delay(milliseconds) {
        events.push(`delay:${milliseconds}`)
      },
      async release() {
        events.push('release')
      }
    })
    viewport.width = 999
    await session.open(png(1, 1), 'a.png')
    expect(document.activeLayer.name).toBe('Original photograph')
    await session.act([{ type: 'wait' }, { type: 'click', button: 'back', x: 2, y: 3 }])
    expect(Array.from(await session.screenshot())).toEqual([1, 2, 3])
    await session.close()
    expect(session.viewport).toEqual({ width: 1280, height: 720 })
    expect(timeouts.length).toBeGreaterThan(0)
    expect(timeouts.every((timeout) => timeout > 0 && timeout <= 4321)).toBe(true)
    expect(events).toEqual([
      'viewport:1280x720',
      'goto:https://example.test/editor',
      'press:v',
      'delay:1000',
      'cdp:create',
      'mousePressed',
      'mouseReleased',
      'cdp:detach',
      'release'
    ])
  })

  test('uses transport defaults and releases an unused session without creating CDP', async () => {
    const events: string[] = []
    const page = {
      context() {
        throw new Error('CDP must be lazy')
      }
    } as unknown as Page
    const session = createPhotopeaEditorSession(page, {
      id: 'production',
      hostUrl: 'https://example.test/editor',
      async release() {
        events.push('release')
      }
    })
    expect(session.id).toBe('production')
    expect(session.viewport).toEqual({ width: 1440, height: 900 })
    await session.close()
    await session.close()
    expect(events).toEqual(['release'])
  })
})
