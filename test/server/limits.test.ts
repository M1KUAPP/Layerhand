// FR-35 to FR-37, each tested by being hit: the free allowance, the daily
// ceiling, and a user's own key bypassing both. Every request goes through the
// HTTP surface of the launch runtime and its real SqlMeterStore.
import { afterEach, describe, expect, test } from 'bun:test'

import { createLaunchRuntime, type LaunchRuntime } from '../../src/server/runtime'

const samplePath = new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)
const opened: { runtime: LaunchRuntime; runIds: string[] }[] = []

afterEach(async () => {
  for (const { runtime, runIds } of opened.splice(0)) {
    for (const runId of runIds) {
      await runtime.registry.cancel(runId).catch(() => undefined)
      await runtime.registry.waitForTerminal(runId)
    }
    await runtime.close()
  }
})

/**
 * A runtime whose scripted runs stay in flight, so their reservations stay
 * held. Each free run reserves the spend cap.
 */
async function runtimeWithBudget(dailyBudgetUsd: number, spendCapUsd: number, fakeRunIntervalMs = 60_000) {
  // The test names the address a request should appear from with a header
  // of its own, so a call meant to be "the same visitor" as an earlier one
  // can share its address deliberately, and a call meant to be a different
  // visitor gets a fresh one by default. Without that, a wave of many
  // different visitors below would also trip the per-address free-run count
  // meant for one of them, rather than testing the daily ceiling on its own
  // (#115); a real wave does arrive from many different addresses.
  let nextAddress = 0
  const runtime = await createLaunchRuntime({
    env: {
      NODE_ENV: 'development',
      FREE_DAILY_BUDGET_USD: String(dailyBudgetUsd),
      FREE_RUN_SPEND_CAP_USD: String(spendCapUsd)
    },
    clientAddress: (request) => request.headers.get('x-test-address') ?? `203.0.113.${(nextAddress += 1)}`,
    fakeRunIntervalMs,
    writeRunLog: () => undefined
  })
  const runIds: string[] = []
  opened.push({ runtime, runIds })

  const start = async (options: { cookie?: string; apiKey?: string; address?: string } = {}) => {
    const form = new FormData()
    form.set('image', new File([Bun.file(samplePath)], 'source.png', { type: 'image/png' }), 'source.png')
    form.set('filename', 'source.png')
    form.set('instruction', 'Remove the background')
    if (options.apiKey) form.set('apiKey', options.apiKey)
    const headers: Record<string, string> = {}
    if (options.cookie) headers.cookie = options.cookie
    if (options.address) headers['x-test-address'] = options.address
    const response = await runtime.application.fetch(
      new Request('http://layerhand.test/api/runs', { method: 'POST', body: form, headers })
    )
    const body = (await response.json()) as { runId?: string; code?: string; message?: string }
    if (body.runId) runIds.push(body.runId)
    const cookie = response.headers.get('set-cookie')?.split(';')[0] ?? options.cookie
    return { status: response.status, body, cookie }
  }
  const snapshot = async (runId: string | undefined) =>
    (await runtime.application.fetch(new Request(`http://layerhand.test/api/runs/${runId}`))).json()

  return { start, snapshot, runtime }
}

// The deployed $3 cap, and the $8 cap of NFR-2 that the TRD's first worked example uses.
const SPEND_CAPS = [3, 8]

describe('metering limits, hit through HTTP', () => {
  test('a visitor gets three free runs, and the fourth is refused with a stated message', async () => {
    const { start } = await runtimeWithBudget(1_000, 3)
    const address = 'address-one-visitor'

    const first = await start({ address })
    const second = await start({ cookie: first.cookie, address })
    const third = await start({ cookie: first.cookie, address })
    const fourth = await start({ cookie: first.cookie, address })

    expect([first.status, second.status, third.status]).toEqual([201, 201, 201])
    expect(fourth.status).toBe(429)
    expect(fourth.body.code).toBe('free_limit_reached')
    expect(fourth.body.message).toBeString()
  })

  test('the free allowance is also capped per address, behind a fresh cookie each time (#115)', async () => {
    // #29 intended the cookie and the address to each be their own limit.
    // No `cookie` is sent back here, so each call is a different visitor —
    // the address alone, at its default of ten a day, is what refuses the
    // eleventh.
    const { start } = await runtimeWithBudget(1_000, 3)
    const address = 'address-shared'

    const statuses: number[] = []
    for (let run = 0; run < 10; run += 1) statuses.push((await start({ address })).status)
    const eleventh = await start({ address })

    expect(statuses).toEqual(Array(10).fill(201))
    expect(eleventh.status).toBe(429)
    expect(eleventh.body.code).toBe('free_limit_reached')
  })

  // docs/TRD.md § Size the daily ceiling: each free run reserves the spend
  // cap, so a ceiling must cover twenty reservations to admit one full wave.
  // A run held back only by what runs in flight reserved waits for it (NFR-4).
  test.each(SPEND_CAPS)(
    'a ceiling of nineteen $%d reservations holds the twentieth concurrent free run in line',
    async (spendCapUsd) => {
      const { start, snapshot } = await runtimeWithBudget(19 * spendCapUsd, spendCapUsd)

      const statuses: number[] = []
      for (let run = 0; run < 19; run++) statuses.push((await start()).status)
      const twentieth = await start()

      expect(statuses).toEqual(Array(19).fill(201))
      expect(twentieth.status).toBe(201)
      expect(await snapshot(twentieth.body.runId)).toMatchObject({ status: 'queued', queuePosition: 1 })
    }
  )

  test("refuses a free run with a stated message once the day's spending leaves no room for it", async () => {
    // Runs that finish at once, so what the first spends is counted rather than reserved.
    const { start, runtime } = await runtimeWithBudget(0.5, 0.3, 1)

    const first = await start()
    await runtime.registry.waitForTerminal(first.body.runId!)
    const second = await start()

    expect(first.status).toBe(201)
    expect(second.status).toBe(429)
    expect(second.body.code).toBe('daily_budget_reached')
    expect(second.body.message).toBeString()
  })

  test.each(SPEND_CAPS)(
    'a ceiling of twenty $%d reservations admits a full wave of twenty concurrent free runs',
    async (spendCapUsd) => {
      const { start } = await runtimeWithBudget(20 * spendCapUsd, spendCapUsd)

      const statuses: number[] = []
      for (let run = 0; run < 20; run++) statuses.push((await start()).status)

      expect(statuses).toEqual(Array(20).fill(201))
    }
  )

  test('the deployed $10 ceiling admits three concurrent free runs at the $3 reservation', async () => {
    const { start, snapshot } = await runtimeWithBudget(10, 3)

    const statuses: number[] = []
    for (let run = 0; run < 3; run++) statuses.push((await start()).status)
    const fourth = await start()

    expect(statuses).toEqual([201, 201, 201])
    expect(await snapshot(fourth.body.runId)).toMatchObject({ status: 'queued' })
  })

  test.each(SPEND_CAPS)(
    "a user's own key still starts runs past both the free allowance and a ceiling of three $%d reservations",
    async (spendCapUsd) => {
      // Three reservations fill the ceiling exactly.
      const { start, snapshot } = await runtimeWithBudget(3 * spendCapUsd, spendCapUsd)
      const address = 'address-one-visitor'

      const first = await start({ address })
      await start({ cookie: first.cookie, address })
      await start({ cookie: first.cookie, address })
      // A different visitor, at a different address, hits the ceiling the three above filled.
      const ceilingHit = await start({ address: 'address-another-visitor' })
      const freeRunsSpent = await start({ cookie: first.cookie, address })
      const withKeyAtCeiling = await start({ apiKey: 'sk-visitor-own-key-000000' })
      const withKeyAfterAllowance = await start({ cookie: first.cookie, address, apiKey: 'sk-visitor-own-key-000000' })

      expect(await snapshot(ceilingHit.body.runId)).toMatchObject({ status: 'queued' })
      expect(freeRunsSpent.body.code).toBe('free_limit_reached')
      expect(withKeyAtCeiling.status).toBe(201)
      expect(withKeyAfterAllowance.status).toBe(201)
    }
  )
})
