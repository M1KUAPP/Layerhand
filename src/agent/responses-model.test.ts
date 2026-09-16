import { describe, expect, test } from 'bun:test'
import { ModelUnavailableError } from './model'
import type { CodeRunner, ResponsesModelOptions } from './responses-model'
import { ResponsesApiError, ResponsesModel, toComputerAction } from './responses-model'

const KEY = 'sk-test-key-that-must-not-leak'
const SCREENSHOT = Uint8Array.of(0x89, 0x50, 0x4e, 0x47)
const SCREENSHOT_URL = `data:image/png;base64,${Buffer.from(SCREENSHOT).toString('base64')}`
const USAGE = { input_tokens: 2_000, input_tokens_details: { cached_tokens: 1_500 }, output_tokens: 120 }

type Sent = { url: string; headers: Headers; body: Record<string, any>; signal: AbortSignal | undefined }

/**
 * Answers each request with the next scripted payload, keeping what was sent.
 * An error is thrown as the network's, and `no answer` waits until the request
 * is aborted.
 */
function scriptedFetch(responses: (Record<string, unknown> | Response | Error | 'no answer')[]) {
  const sent: Sent[] = []
  const fetch = (async (url: string, init: RequestInit) => {
    sent.push({
      url,
      headers: new Headers(init.headers),
      body: JSON.parse(String(init.body)),
      signal: init.signal ?? undefined
    })
    const next = responses[sent.length - 1]
    if (!next) throw new Error('No scripted response left')
    if (next instanceof Error) throw next
    if (next === 'no answer') {
      return new Promise<never>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
      })
    }
    return next instanceof Response ? next : Response.json(next)
  }) as unknown as typeof globalThis.fetch
  return { fetch, sent }
}

/** Keeps each wait a retry asks for, without waiting. */
function recordedSleep() {
  const waits: number[] = []
  const sleep = async (ms: number, signal: AbortSignal) => {
    waits.push(ms)
    if (signal.aborted) throw signal.reason
  }
  return { sleep, waits }
}

const observe = (corrections: string[] = []) => ({ screenshot: SCREENSHOT, corrections })
const signal = () => new AbortController().signal
const rateLimited = (headers: Record<string, string> = {}) =>
  Response.json(
    { error: { code: 'rate_limit_exceeded', message: `Limit reached for ${KEY}` } },
    { status: 429, headers }
  )
const serverError = (status: number) => Response.json({ error: { code: 'server_error' } }, { status })

describe('ResponsesModel with the computer tool', () => {
  test('sends the instruction as its own message, the screenshot at original detail, and an explicit effort', async () => {
    const { fetch, sent } = scriptedFetch([{ id: 'resp_1', output: [], usage: USAGE }])
    const model = new ResponsesModel({
      apiKey: KEY,
      instruction: 'Warm the highlights',
      stepCap: 40,
      mechanism: 'computer',
      fetch
    })

    const turn = await model.next(observe(), signal())

    const [request] = sent
    expect(request!.url).toBe('https://api.openai.com/v1/responses')
    expect(request!.headers.get('authorization')).toBe(`Bearer ${KEY}`)
    expect(request!.body).toMatchObject({
      model: 'gpt-6-astra',
      tools: [{ type: 'computer' }],
      parallel_tool_calls: false,
      reasoning: { effort: 'low' }
    })
    expect(request!.body.previous_response_id).toBeUndefined()
    expect(request!.body.instructions).not.toContain('Warm the highlights')
    expect(request!.body.input[0]).toEqual({
      role: 'user',
      content: [{ type: 'input_text', text: 'Warm the highlights' }]
    })
    expect(request!.body.input[1].content[1]).toEqual({
      type: 'input_image',
      image_url: SCREENSHOT_URL,
      detail: 'original'
    })
    expect(turn).toEqual({
      narration: '',
      actions: [],
      usage: { inputTokens: 2_000, cachedInputTokens: 1_500, outputTokens: 120 },
      done: true
    })
  })

  test('turns a computer call into actions, then returns its screenshot and any correction', async () => {
    const { fetch, sent } = scriptedFetch([
      {
        id: 'resp_1',
        output: [
          { type: 'reasoning', id: 'rs_1', summary: [] },
          {
            type: 'message',
            role: 'assistant',
            phase: 'commentary',
            content: [{ type: 'output_text', text: 'Opening the Adjustments panel\nthen more' }]
          },
          {
            type: 'computer_call',
            id: 'cu_1',
            call_id: 'call_1',
            actions: [
              { type: 'click', button: 'left', x: 1300, y: 120 },
              { type: 'keypress', keys: ['CTRL', 'M'] }
            ],
            pending_safety_checks: [],
            status: 'completed'
          }
        ],
        usage: USAGE
      },
      { id: 'resp_2', output: [], usage: USAGE }
    ])
    const model = new ResponsesModel({
      apiKey: KEY,
      instruction: 'Brighten',
      stepCap: 40,
      mechanism: 'computer',
      fetch
    })

    const first = await model.next(observe(), signal())
    await model.next(observe(['Keep the shadow']), signal())

    expect(first).toMatchObject({
      narration: 'Opening the Adjustments panel',
      actions: [
        { type: 'click', button: 'left', x: 1300, y: 120 },
        { type: 'keypress', keys: ['CTRL', 'M'] }
      ],
      done: false
    })
    expect(sent[1]!.body.previous_response_id).toBe('resp_1')
    expect(sent[1]!.body.input).toEqual([
      {
        type: 'computer_call_output',
        call_id: 'call_1',
        output: { type: 'computer_screenshot', image_url: SCREENSHOT_URL, detail: 'original' }
      },
      { role: 'user', content: [{ type: 'input_text', text: 'Correction from the user: Keep the shadow' }] }
    ])
    // A changed tool array would invalidate the prompt cache.
    expect(JSON.stringify(sent[1]!.body.tools)).toBe(JSON.stringify(sent[0]!.body.tools))
    expect(sent[1]!.body.instructions).toBe(sent[0]!.body.instructions)
  })

  test('acknowledges the safety checks an unattended run cannot put to a person, and counts them', async () => {
    const check = { id: 'sc_1', code: 'malicious_instructions', message: 'Check this' }
    const { fetch, sent } = scriptedFetch([
      {
        id: 'resp_1',
        output: [
          { type: 'computer_call', call_id: 'call_1', actions: [{ type: 'wait' }], pending_safety_checks: [check] }
        ]
      },
      { id: 'resp_2', output: [] }
    ])
    const model = new ResponsesModel({
      apiKey: KEY,
      instruction: 'Brighten',
      stepCap: 40,
      mechanism: 'computer',
      fetch
    })

    await model.next(observe(), signal())
    await model.next(observe(), signal())

    expect(sent[1]!.body.input[0].acknowledged_safety_checks).toEqual([check])
    expect(model.safetyChecksAcknowledged).toBe(1)
  })
})

describe('ResponsesModel with code execution', () => {
  test('runs the code itself, narrates from the call, and returns the logs with a screenshot', async () => {
    const ran: string[] = []
    const runner: CodeRunner = {
      async run(code) {
        ran.push(code)
        return { logs: ['clicked'], error: 'Timeout 30000ms exceeded' }
      }
    }
    const { fetch, sent } = scriptedFetch([
      {
        id: 'resp_1',
        output: [
          {
            type: 'function_call',
            call_id: 'call_1',
            name: 'run_code',
            arguments: JSON.stringify({ narration: 'Adding a Curves layer', code: 'await page.mouse.click(1, 2)' })
          }
        ],
        usage: USAGE
      },
      { id: 'resp_2', output: [], usage: USAGE }
    ])
    const model = new ResponsesModel({
      apiKey: KEY,
      instruction: 'Brighten',
      stepCap: 40,
      mechanism: 'code',
      codeRunner: runner,
      fetch
    })

    const first = await model.next(observe(), signal())
    await model.next(observe(), signal())

    expect(ran).toEqual(['await page.mouse.click(1, 2)'])
    expect(first).toMatchObject({ narration: 'Adding a Curves layer', actions: [], done: false })
    expect(sent[0]!.body.tools).toEqual([expect.objectContaining({ type: 'function', name: 'run_code', strict: true })])
    expect(sent[1]!.body.input).toEqual([
      {
        type: 'function_call_output',
        call_id: 'call_1',
        output: [
          { type: 'input_text', text: 'Logs:\nclicked\n\nIt failed: Timeout 30000ms exceeded' },
          { type: 'input_image', image_url: SCREENSHOT_URL, detail: 'original' }
        ]
      }
    ])
  })

  test('reports unreadable arguments back to the model instead of stopping the run', async () => {
    const runner: CodeRunner = { run: async () => ({ logs: [] }) }
    const { fetch, sent } = scriptedFetch([
      { id: 'resp_1', output: [{ type: 'function_call', call_id: 'call_1', name: 'run_code', arguments: '{oops' }] },
      { id: 'resp_2', output: [] }
    ])
    const model = new ResponsesModel({
      apiKey: KEY,
      instruction: 'Brighten',
      stepCap: 40,
      mechanism: 'code',
      codeRunner: runner,
      fetch
    })

    expect((await model.next(observe(), signal())).done).toBe(false)
    await model.next(observe(), signal())

    expect(sent[1]!.body.input[0].output[0].text).toContain('did not carry a code string')
  })

  test('forbids Photopea scripting in the prompt for both mechanisms', async () => {
    const runner: CodeRunner = { run: async () => ({ logs: [] }) }
    const instructions = await Promise.all(
      (['computer', 'code'] as const).map(async (mechanism) => {
        const { fetch, sent } = scriptedFetch([{ id: 'resp_1', output: [] }])
        const model = new ResponsesModel({
          apiKey: KEY,
          instruction: 'x',
          stepCap: 1,
          mechanism,
          codeRunner: runner,
          fetch
        })
        await model.next(observe(), signal())
        return sent[0]!.body.instructions as string
      })
    )

    for (const prompt of instructions) {
      expect(prompt).toContain("Do not use Photopea's scripting interface: not its script dialog, and not postMessage.")
    }
  })

  test('needs a code runner', () => {
    expect(() => new ResponsesModel({ apiKey: KEY, instruction: 'x', stepCap: 1, mechanism: 'code' })).toThrow(
      'code runner'
    )
  })
})

describe('ResponsesModel failures', () => {
  test('reports a refused call by its status and error code, never the provider message, and does not send it again', async () => {
    const body = { error: { code: 'invalid_api_key', message: `Incorrect API key provided: ${KEY}` } }
    const { fetch, sent } = scriptedFetch([Response.json(body, { status: 401 })])
    const model = new ResponsesModel({ apiKey: KEY, instruction: 'x', stepCap: 1, mechanism: 'computer', fetch })

    const failure = await model.next(observe(), signal()).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ResponsesApiError)
    expect(failure).toMatchObject({ status: 401, code: 'invalid_api_key' })
    expect(String((failure as Error).message)).not.toContain(KEY)
    expect(sent).toHaveLength(1)
  })

  test('drops an error code that could quote the request, even on a 200', async () => {
    const { fetch } = scriptedFetch([{ id: 'resp_1', error: { code: `Bad key ${KEY}` } }])
    const model = new ResponsesModel({ apiKey: KEY, instruction: 'x', stepCap: 1, mechanism: 'computer', fetch })

    const failure = await model.next(observe(), signal()).catch((error: unknown) => error)

    expect(failure).toMatchObject({ status: 200, code: undefined })
    expect(String((failure as Error).message)).not.toContain(KEY)
  })

  test("aborts the request when the run's signal aborts", async () => {
    const { fetch, sent } = scriptedFetch([{ id: 'resp_1', output: [] }])
    const model = new ResponsesModel({ apiKey: KEY, instruction: 'x', stepCap: 1, mechanism: 'computer', fetch })
    const aborter = new AbortController()

    await model.next(observe(), aborter.signal)
    expect(sent[0]!.signal?.aborted).toBe(false)
    aborter.abort()

    expect(sent[0]!.signal?.aborted).toBe(true)
  })

  test('reads a key given as a function at each call, and sends nothing once it is gone', async () => {
    let key: string | undefined = KEY
    const { fetch, sent } = scriptedFetch([{ id: 'resp_1', output: [] }])
    const model = new ResponsesModel({ apiKey: () => key, instruction: 'x', stepCap: 2, mechanism: 'computer', fetch })

    await model.next(observe(), signal())
    key = undefined
    const failure = await model.next(observe(), signal()).catch((error: unknown) => error)

    expect(sent[0]!.headers.get('authorization')).toBe(`Bearer ${KEY}`)
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('The run has no API key')
    expect(sent).toHaveLength(1)
  })

  test('refuses malformed and unsupported actions', () => {
    expect(() => toComputerAction({ type: 'click', button: 'left', x: '1', y: 2 })).toThrow('malformed')
    expect(() => toComputerAction({ type: 'zoom' })).toThrow('does not support')
    expect(() => toComputerAction({ type: 'keypress' })).toThrow('malformed')
    expect(() => toComputerAction({ type: 'keypress', keys: [] })).toThrow('malformed')
    expect(toComputerAction({ type: 'drag', path: [{ x: 1, y: 2 }], keys: ['SHIFT'] })).toEqual({
      type: 'drag',
      path: [{ x: 1, y: 2 }],
      keys: ['SHIFT']
    })
  })
})

describe('ResponsesModel retries', () => {
  const retrying = (fetch: typeof globalThis.fetch, overrides: Partial<ResponsesModelOptions> = {}) =>
    new ResponsesModel({ apiKey: KEY, instruction: 'x', stepCap: 40, mechanism: 'computer', fetch, ...overrides })
  const ANSWER = { id: 'resp_1', output: [], usage: USAGE }

  test('sends a rate-limited call again, corrections and all, after the wait the server asks for', async () => {
    const { fetch, sent } = scriptedFetch([rateLimited({ 'retry-after': '3' }), ANSWER])
    const { sleep, waits } = recordedSleep()

    const turn = await retrying(fetch, { sleep }).next(observe(['Keep the shadow']), signal())

    expect(turn).toMatchObject({ done: true, usage: { inputTokens: 2_000 } })
    expect(waits).toEqual([3_000])
    expect(sent).toHaveLength(2)
    expect(sent[1]!.body).toEqual(sent[0]!.body)
  })

  test('sends a call again after server errors and a failed connection, waiting about twice as long each time', async () => {
    const { fetch, sent } = scriptedFetch([
      serverError(500),
      serverError(503),
      new TypeError('Unable to connect. Is the computer able to access the url?'),
      ANSWER
    ])
    const { sleep, waits } = recordedSleep()

    expect(await retrying(fetch, { sleep }).next(observe(), signal())).toMatchObject({ done: true })

    expect(sent).toHaveLength(4)
    expect(waits).toHaveLength(3)
    waits.forEach((wait, retries) => {
      expect(wait).toBeGreaterThanOrEqual(500 * 2 ** retries)
      expect(wait).toBeLessThanOrEqual(1_000 * 2 ** retries)
    })
  })

  test('gives up once six retries have failed, naming the last failure but never quoting the provider', async () => {
    const { fetch, sent } = scriptedFetch(Array.from({ length: 7 }, () => rateLimited()))
    const { sleep, waits } = recordedSleep()

    const failure = await retrying(fetch, { sleep })
      .next(observe(), signal())
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ModelUnavailableError)
    expect((failure as Error).message).toBe(
      'Gave up on the model after 7 attempts: The Responses API returned HTTP 429 (rate_limit_exceeded)'
    )
    expect(sent).toHaveLength(7)
    expect(waits).toHaveLength(6)
    expect(Math.max(...waits)).toBeLessThanOrEqual(30_000)
  })

  test('gives up at once when the server asks for a longer wait than any retry makes', async () => {
    const { fetch, sent } = scriptedFetch([rateLimited({ 'retry-after': '120' })])
    const { sleep, waits } = recordedSleep()

    const failure = await retrying(fetch, { sleep })
      .next(observe(), signal())
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ModelUnavailableError)
    expect(sent).toHaveLength(1)
    expect(waits).toEqual([])
  })

  test('gives a call that never answers its own timeout, then sends it again', async () => {
    const { fetch, sent } = scriptedFetch(['no answer', ANSWER])
    const { sleep, waits } = recordedSleep()

    const turn = await retrying(fetch, { sleep, callTimeoutMs: 20 }).next(observe(), signal())

    expect(turn).toMatchObject({ done: true })
    expect(sent[0]!.signal?.aborted).toBe(true)
    expect(sent).toHaveLength(2)
    expect(waits).toHaveLength(1)
  })

  test('stops waiting to retry once the run is cancelled', async () => {
    const { fetch, sent } = scriptedFetch([rateLimited()])
    const aborter = new AbortController()

    const turn = retrying(fetch).next(observe(), aborter.signal)
    await Bun.sleep(20)
    aborter.abort(new Error('cancelled'))

    await expect(turn).rejects.toThrow('cancelled')
    expect(sent).toHaveLength(1)
  })

  test('sends nothing more once the run has released its key', async () => {
    let key: string | undefined = KEY
    const { fetch, sent } = scriptedFetch([rateLimited()])
    const sleep = async () => {
      key = undefined
    }

    const failure = await retrying(fetch, { apiKey: () => key, sleep })
      .next(observe(), signal())
      .catch((error: unknown) => error)

    expect((failure as Error).message).toBe('The run has no API key')
    expect(sent).toHaveLength(1)
  })
})
