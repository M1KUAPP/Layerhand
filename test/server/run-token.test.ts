import { describe, expect, test } from 'bun:test'

import { createRunToken, verifyRunToken } from '../../src/server/run-token'

describe('run token', () => {
  test('verifies a token made for its own run id', async () => {
    const token = await createRunToken('session-secret', 'run-1')

    expect(await verifyRunToken('session-secret', 'run-1', token)).toBe(true)
  })

  test('refuses a token presented for another run id', async () => {
    const token = await createRunToken('session-secret', 'run-1')

    expect(await verifyRunToken('session-secret', 'run-2', token)).toBe(false)
  })

  test('refuses a truncated token', async () => {
    const token = await createRunToken('session-secret', 'run-1')

    expect(await verifyRunToken('session-secret', 'run-1', token.slice(0, -4))).toBe(false)
  })

  test('refuses a token made under a different secret', async () => {
    const token = await createRunToken('another-secret', 'run-1')

    expect(await verifyRunToken('session-secret', 'run-1', token)).toBe(false)
  })
})
