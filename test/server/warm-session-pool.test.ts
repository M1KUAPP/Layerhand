// The pool that warms an editor session while the user types (#70): one
// billed session per visitor, handed to a run once, and released if nobody
// claims it.
import { describe, expect, test } from 'bun:test'

import type { LayerInfo } from '../../src/editor/session'
import { imageDigest, WarmSessionPool, type WarmEditorSession } from '../../src/server/warm-session-pool'

const IMAGE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47)
const OTHER_IMAGE = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0)
const LAYERS: LayerInfo[] = [{ name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] }]

/** An editor session that records what was asked of it. */
function fakeSession(id: string, openFails = false) {
  const opened: string[] = []
  let abandoned = 0
  const session: WarmEditorSession = {
    id,
    viewport: { width: 1440, height: 900 },
    async open(_image, filename) {
      opened.push(filename)
      if (openFails) throw new Error('Photopea never became ready')
    },
    screenshot: async () => IMAGE,
    act: async () => undefined,
    layers: async () => LAYERS,
    exportPsd: async () => IMAGE,
    exportPreview: async () => IMAGE,
    close: async () => undefined,
    abandon: async () => void (abandoned += 1)
  }
  return {
    session,
    opened,
    get abandoned() {
      return abandoned
    }
  }
}

/** A pool whose timers the test fires itself. */
function pooled(options: { openFails?: boolean; maxWarm?: number } = {}) {
  const sessions: ReturnType<typeof fakeSession>[] = []
  const timers: (() => void)[] = []
  let cleared = 0
  const pool = new WarmSessionPool({
    create() {
      const next = fakeSession(`session-${sessions.length + 1}`, options.openFails)
      sessions.push(next)
      return next.session
    },
    ...(options.maxWarm === undefined ? {} : { maxWarm: options.maxWarm }),
    idGenerator: () => `upload-${sessions.length + 1}`,
    setTimer: (run) => {
      timers.push(run)
      return timers.length as unknown as ReturnType<typeof setTimeout>
    },
    clearTimer: () => void (cleared += 1)
  })
  return {
    pool,
    sessions,
    fireTimers: () => {
      for (const timer of timers.splice(0)) timer()
    },
    get cleared() {
      return cleared
    }
  }
}

describe('WarmSessionPool', () => {
  test('hands a run the session it warmed, which opens the image only once', async () => {
    const { pool, sessions } = pooled()
    const uploadId = await pool.warm('visitor-1', IMAGE, 'source.png')

    const claimed = pool.claim(uploadId, 'visitor-1', await imageDigest(IMAGE))
    await claimed!.open(IMAGE, 'source.png')

    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.opened).toEqual(['source.png'])
    expect(claimed!.id).toBe('session-1')
    expect(pool.size).toBe(0)
  })

  test('opens an image the session was not warmed with', async () => {
    const { pool, sessions } = pooled()
    const uploadId = await pool.warm('visitor-1', IMAGE, 'source.png')

    const claimed = pool.claim(uploadId, 'visitor-1', await imageDigest(IMAGE))
    await claimed!.open(OTHER_IMAGE, 'other.jpg')

    expect(sessions[0]!.opened).toEqual(['source.png', 'other.jpg'])
  })

  test('gives one visitor one billed session: a second upload releases the first', async () => {
    const { pool, sessions } = pooled()
    const first = await pool.warm('visitor-1', IMAGE, 'source.png')

    const second = await pool.warm('visitor-1', OTHER_IMAGE, 'other.jpg')

    expect(sessions[0]!.abandoned).toBe(1)
    expect(sessions[1]!.abandoned).toBe(0)
    expect(pool.claim(first, 'visitor-1', await imageDigest(IMAGE))).toBeUndefined()
    expect(pool.claim(second, 'visitor-1', await imageDigest(OTHER_IMAGE))).toBeDefined()
    expect(pool.size).toBe(0)
  })

  test('releases a session no run claimed', async () => {
    const { pool, sessions, fireTimers } = pooled()
    const uploadId = await pool.warm('visitor-1', IMAGE, 'source.png')

    fireTimers()
    await Bun.sleep(1)

    expect(sessions[0]!.abandoned).toBe(1)
    expect(pool.claim(uploadId, 'visitor-1', await imageDigest(IMAGE))).toBeUndefined()
  })

  test('refuses an upload that is unknown, belongs to another visitor, or holds a different image', async () => {
    const { pool } = pooled()
    const uploadId = await pool.warm('visitor-1', IMAGE, 'source.png')
    const digest = await imageDigest(IMAGE)

    expect(pool.claim(undefined, 'visitor-1', digest)).toBeUndefined()
    expect(pool.claim('upload-never', 'visitor-1', digest)).toBeUndefined()
    expect(pool.claim(uploadId, 'visitor-2', digest)).toBeUndefined()
    expect(pool.claim(uploadId, 'visitor-1', await imageDigest(OTHER_IMAGE))).toBeUndefined()
    // None of those consumed it.
    expect(pool.claim(uploadId, 'visitor-1', digest)).toBeDefined()
  })

  test('does not hand out a session that could not open its image', async () => {
    const { pool } = pooled({ openFails: true })
    const uploadId = await pool.warm('visitor-1', IMAGE, 'source.png')
    await Bun.sleep(1)

    expect(pool.claim(uploadId, 'visitor-1', await imageDigest(IMAGE))).toBeUndefined()
  })

  test('warms nothing past its bound, however many visitors ask', async () => {
    const { pool, sessions } = pooled({ maxWarm: 2 })

    const first = await pool.warm('visitor-1', IMAGE, 'source.png')
    const second = await pool.warm('visitor-2', IMAGE, 'source.png')
    // A third visitor, which is all a rotated cookie amounts to.
    const third = await pool.warm('visitor-3', IMAGE, 'source.png')

    expect([first, second]).toEqual(['upload-1', 'upload-2'])
    expect(third).toBeUndefined()
    expect(sessions).toHaveLength(2)
    expect(pool.size).toBe(2)

    // A claim frees the slot, so the next upload warms again.
    pool.claim(first, 'visitor-1', await imageDigest(IMAGE))
    expect(await pool.warm('visitor-3', IMAGE, 'source.png')).toBe('upload-3')
  })

  test('does not release a session after a run has claimed it', async () => {
    const { pool, sessions, fireTimers } = pooled()
    const uploadId = await pool.warm('visitor-1', IMAGE, 'source.png')

    const claimed = pool.claim(uploadId, 'visitor-1', await imageDigest(IMAGE))
    // The timer for that upload fires after the run took the session.
    fireTimers()
    await Bun.sleep(1)

    expect(claimed).toBeDefined()
    expect(sessions[0]!.abandoned).toBe(0)
  })

  test('releases every warm session on shutdown, and warms nothing afterwards', async () => {
    const { pool, sessions } = pooled()
    await pool.warm('visitor-1', IMAGE, 'source.png')
    await pool.warm('visitor-2', IMAGE, 'source.png')

    await pool.close()

    expect(sessions.map((session) => session.abandoned)).toEqual([1, 1])
    expect(pool.size).toBe(0)
    expect(await pool.warm('visitor-3', IMAGE, 'source.png')).toBeUndefined()
  })
})
