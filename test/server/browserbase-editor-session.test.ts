import { describe, expect, test } from 'bun:test'
import type { Page } from 'playwright-core'

import type { CreatePhotopeaEditorSessionOptions } from '../../src/editor/photopea-editor-session'
import { createRecordedFakeEditorSession } from '../../src/editor/fake-editor-session'
import type { EditorSession } from '../../src/editor/session'
import { browserbaseEditorSession, type BrowserbaseSessions } from '../../src/server/browserbase-editor-session'

const CONNECT_URL = 'wss://connect.browserbase.test/?signingKey=secret-signing-key'
const HOST_URL = 'https://layerhand.test/photopea-host'
const IMAGE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47)

interface Harness {
  session: EditorSession
  created: string[]
  released: string[]
  browserClosed: number
  editorOptions: CreatePhotopeaEditorSessionOptions[]
}

async function harness(
  failures: { connect?: boolean; editor?: boolean; browserClose?: boolean } = {}
): Promise<Harness> {
  const recorded = await createRecordedFakeEditorSession()
  const state: Omit<Harness, 'session'> = { created: [], released: [], browserClosed: 0, editorOptions: [] }
  const sessions: BrowserbaseSessions = {
    async createSession() {
      const id = `bb-${state.created.length + 1}`
      state.created.push(id)
      return { id, projectId: 'project', connectUrl: CONNECT_URL }
    },
    async releaseSession(id) {
      state.released.push(id)
    }
  }
  const session = browserbaseEditorSession({
    id: 'run-editor',
    hostUrl: HOST_URL,
    sessions,
    async connect(connectUrl) {
      if (failures.connect) throw new Error(`Could not connect to ${connectUrl}`)
      return {
        page: {} as Page,
        async close() {
          state.browserClosed += 1
          if (failures.browserClose) throw new Error('The browser did not close')
        }
      }
    },
    createEditorSession(_page, options) {
      state.editorOptions.push(options)
      if (failures.editor) throw new Error('Photopea host URL must use HTTP or HTTPS.')
      // The recorded editor, releasing its browser on close as the Photopea session does.
      return {
        id: options.id,
        viewport: recorded.viewport,
        open: (image, filename) => recorded.open(image, filename),
        screenshot: () => recorded.screenshot(),
        act: (actions) => recorded.act(actions),
        layers: () => recorded.layers(),
        exportPsd: () => recorded.exportPsd(),
        exportPreview: () => recorded.exportPreview(),
        async close() {
          await recorded.close()
          await options.release()
        }
      }
    }
  })
  return Object.assign(state, { session })
}

describe('Browserbase editor session', () => {
  test('creates no browser until the run opens its image, then opens Photopea in one', async () => {
    const h = await harness()
    expect(h.session.viewport).toEqual({ width: 1440, height: 900 })
    expect(h.created).toEqual([])

    await h.session.open(IMAGE, 'source.png')
    await h.session.screenshot()

    expect(h.created).toEqual(['bb-1'])
    expect(h.editorOptions).toHaveLength(1)
    expect(h.editorOptions[0]).toMatchObject({
      id: 'run-editor',
      hostUrl: HOST_URL,
      viewport: { width: 1440, height: 900 }
    })
  })

  test('closing the editor closes the browser and releases the session, once', async () => {
    const h = await harness()
    await h.session.open(IMAGE, 'source.png')

    await h.session.close()
    await h.session.close()

    expect(h.browserClosed).toBe(1)
    expect(h.released).toEqual(['bb-1'])
    await expect(h.session.screenshot()).rejects.toThrow('The editor session is closed')
  })

  test('releases the session when its browser cannot be reached, without repeating the address', async () => {
    const h = await harness({ connect: true })

    const failure = await h.session.open(IMAGE, 'source.png').catch((error: Error) => error)
    await h.session.close()

    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('The editor browser could not be reached')
    expect((failure as Error).message).not.toContain('signingKey')
    expect(h.released).toEqual(['bb-1'])
  })

  test('closes the browser and releases the session when the editor cannot be created', async () => {
    const h = await harness({ editor: true })

    await expect(h.session.open(IMAGE, 'source.png')).rejects.toThrow('Photopea host URL')
    await h.session.close()

    expect(h.browserClosed).toBe(1)
    expect(h.released).toEqual(['bb-1'])
  })

  test('releases the session even when the browser fails to close', async () => {
    const h = await harness({ browserClose: true })
    await h.session.open(IMAGE, 'source.png')

    await expect(h.session.close()).rejects.toThrow('The browser did not close')

    expect(h.released).toEqual(['bb-1'])
  })

  test('a session closed before it opened never creates a browser', async () => {
    const h = await harness()

    await h.session.close()

    await expect(h.session.open(IMAGE, 'source.png')).rejects.toThrow('The editor session is closed')
    expect(h.created).toEqual([])
  })
})
