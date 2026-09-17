import { describe, expect, test } from 'bun:test'

import { checkOpenAiKey } from '../../src/server/openai-key'

describe('checkOpenAiKey', () => {
  test('lists models with the key, and accepts a key OpenAI answers for', async () => {
    const requests: { input: string | URL | Request; init?: RequestInit }[] = []

    const check = await checkOpenAiKey('sk-visitor-own-key-000000', async (input, init) => {
      requests.push({ input, init })
      return Response.json({ object: 'list', data: [] })
    })

    expect(check).toBe('accepted')
    expect(requests).toHaveLength(1)
    expect(String(requests[0]!.input)).toBe('https://api.openai.com/v1/models')
    expect(requests[0]!.init?.method ?? 'GET').toBe('GET')
    expect(new Headers(requests[0]!.init?.headers).get('authorization')).toBe('Bearer sk-visitor-own-key-000000')
  })

  test('refuses a key OpenAI does not recognise', async () => {
    const check = await checkOpenAiKey('sk-visitor-own-key-000000', async () =>
      Response.json({ error: { message: 'Incorrect API key provided' } }, { status: 401 })
    )

    expect(check).toBe('refused')
  })

  test('accepts a key OpenAI recognises but does not let list models', async () => {
    const check = await checkOpenAiKey('sk-visitor-own-key-000000', async () =>
      Response.json({ error: { message: 'You have insufficient permissions for this operation.' } }, { status: 403 })
    )

    expect(check).toBe('accepted')
  })

  test('gives up on OpenAI after four seconds, inside the five a run has to start in', async () => {
    const startedAt = performance.now()

    const check = await checkOpenAiKey(
      'sk-visitor-own-key-000000',
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        })
    )
    const elapsedMs = performance.now() - startedAt

    expect(check).toBe('unchecked')
    expect(elapsedMs).toBeGreaterThanOrEqual(3_900)
    expect(elapsedMs).toBeLessThan(4_900)
  }, 6_000)

  test('leaves a key unchecked when OpenAI fails, is busy, or cannot be reached', async () => {
    const answer = (status: number) => async () => new Response('', { status })

    expect(await checkOpenAiKey('sk-visitor-own-key-000000', answer(500))).toBe('unchecked')
    expect(await checkOpenAiKey('sk-visitor-own-key-000000', answer(429))).toBe('unchecked')
    expect(
      await checkOpenAiKey('sk-visitor-own-key-000000', async () => {
        throw new TypeError('fetch failed')
      })
    ).toBe('unchecked')
  })
})
