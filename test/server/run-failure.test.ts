import { describe, expect, test } from 'bun:test'

import { createRecordedFakeEditorSession } from '../../src/editor/fake-editor-session'
import { describeFailure, FailureRecorder } from '../../src/server/run-failure'

const KEY = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789'

describe('describeFailure', () => {
  test("keeps the error's name, and its message with keys and web addresses removed", () => {
    const error = new TypeError(
      `connect failed for wss://connect.browserbase.test/?signingKey=secret-signing-key using ${KEY}; see https://api.example.test/v1/x?token=abc`
    )

    const failure = describeFailure('editor_open_failed', error)

    expect(failure.code).toBe('editor_open_failed')
    expect(failure.errorName).toBe('TypeError')
    expect(failure.message).toBe('connect failed for [url] using [redacted]; see [url]')
    expect(JSON.stringify(failure)).not.toContain('secret-signing-key')
    expect(JSON.stringify(failure)).not.toContain(KEY)
  })

  test('keeps at most three stack frames, and not the message the stack repeats', () => {
    const error = new Error(`boom ${KEY}`)
    error.stack = [
      `Error: boom ${KEY}`,
      '    at one (/app/dist/index.js:1:1)',
      '    at two (/app/dist/index.js:2:2)',
      '    at three (https://cdn.example.test/chunk.js:3:3)',
      '    at four (/app/dist/index.js:4:4)'
    ].join('\n')

    expect(describeFailure('run_failed', error).stack).toEqual([
      'at one (/app/dist/index.js:1:1)',
      'at two (/app/dist/index.js:2:2)',
      'at three ([url])'
    ])
  })

  test('carries no details when there was no error', () => {
    expect(describeFailure('missing_narration')).toEqual({
      code: 'missing_narration',
      errorName: null,
      message: null,
      stack: []
    })
  })
})

describe('FailureRecorder', () => {
  async function watchedSession() {
    const recorder = new FailureRecorder()
    const recorded = await createRecordedFakeEditorSession()
    const session = recorder.session(recorded)
    await session.open(Uint8Array.of(1), 'source.png')
    return { recorder, recorded, session }
  }

  test('names the editor action that failed', async () => {
    const { recorder, recorded, session } = await watchedSession()
    recorded.act = async () => {
      throw new Error('keyboard.press: Target closed')
    }

    await expect(session.act([{ type: 'wait' }])).rejects.toThrow('Target closed')

    expect(recorder.failure(false)).toMatchObject({
      code: 'editor_action_failed',
      message: 'keyboard.press: Target closed'
    })
  })

  test('names a model call that failed', async () => {
    const recorder = new FailureRecorder()
    const model = recorder.model({
      next: async () => {
        throw new Error('The Responses API returned HTTP 500')
      }
    })

    await expect(
      model.next({ screenshot: Uint8Array.of(1), corrections: [] }, new AbortController().signal)
    ).rejects.toThrow()

    expect(recorder.failure(false).code).toBe('model_call_failed')
  })

  test('keeps the failure that ended the run when recovery also fails', async () => {
    const recorder = new FailureRecorder()
    const recorded = await createRecordedFakeEditorSession()
    const model = recorder.model({
      next: async () => {
        throw new Error('The Responses API returned HTTP 500')
      }
    })
    recorded.exportPsd = async () => {
      throw new Error('The recovery export failed')
    }
    const session = recorder.session(recorded)

    await expect(
      model.next({ screenshot: Uint8Array.of(1), corrections: [] }, new AbortController().signal)
    ).rejects.toThrow('HTTP 500')
    recorder.freeze()
    await expect(session.exportPsd()).rejects.toThrow('recovery export failed')

    expect(recorder.failure(false)).toMatchObject({
      code: 'model_call_failed',
      message: 'The Responses API returned HTTP 500'
    })
  })

  test('names a publish that failed', async () => {
    const recorder = new FailureRecorder()
    const publish = recorder.publish(async () => {
      throw new Error('S3 put failed')
    })

    await expect(publish(Uint8Array.of(1), 'psd')).rejects.toThrow()

    expect(recorder.failure(false).code).toBe('publish_failed')
  })

  test('blames the layer policy when every call succeeded through reading the layers, even after a missed frame', async () => {
    const { recorder, recorded, session } = await watchedSession()
    const screenshot = recorded.screenshot.bind(recorded)
    let missed = false
    recorded.screenshot = async () => {
      if (!missed) {
        missed = true
        throw new Error('frame capture failed')
      }
      return screenshot()
    }

    await expect(session.screenshot()).rejects.toThrow()
    await session.exportPsd()
    await session.layers()

    expect(recorder.failure(false).code).toBe('layer_policy_failed')
  })

  test('blames a screenshot only when nothing else explains the failure', async () => {
    const { recorder, recorded, session } = await watchedSession()
    recorded.screenshot = async () => {
      throw new Error('screenshot failed')
    }

    await expect(session.screenshot()).rejects.toThrow()

    expect(recorder.failure(false).code).toBe('editor_screenshot_failed')
  })

  test('reports missing narration, and an unexplained failure', () => {
    expect(new FailureRecorder().failure(true).code).toBe('missing_narration')
    expect(new FailureRecorder().failure(false).code).toBe('run_failed')
  })

  test('passes the session id and viewport through', async () => {
    const { recorded, session } = await watchedSession()

    expect(session.id).toBe(recorded.id)
    expect(session.viewport).toEqual(recorded.viewport)
  })
})
