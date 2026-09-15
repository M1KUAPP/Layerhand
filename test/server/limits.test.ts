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
async function runtimeWithBudget(dailyBudgetUsd: number, spendCapUsd: number) {
  const runtime = await createLaunchRuntime({
    env: {
      NODE_ENV: 'development',
      FREE_DAILY_BUDGET_USD: String(dailyBudgetUsd),
      FREE_RUN_SPEND_CAP_USD: String(spendCapUsd)
    },
    clientAddress: () => '203.0.113.40',
    fakeRunIntervalMs: 60_000,
    writeRunLog: () => undefined
  })
  const runIds: string[] = []
  opened.push({ runtime, runIds })

  const start = async (options: { cookie?: string; apiKey?: string } = {}) => {
    const form = new FormData()
    form.set('image', new File([Bun.file(samplePath)], 'source.png', { type: 'image/png' }), 'source.png')
    form.set('filename', 'source.png')
    form.set('instruction', 'Remove the background')
    if (options.apiKey) form.set('apiKey', options.apiKey)
    const response = await runtime.application.fetch(
      new Request('http://layerhand.test/api/runs', {
        method: 'POST',
        body: form,
        headers: options.cookie ? { cookie: options.cookie } : undefined
      })
    )
    const body = (await response.json()) as { runId?: string; code?: string; message?: string }
    if (body.runId) runIds.push(body.runId)
    const cookie = response.headers.get('set-cookie')?.split(';')[0] ?? options.cookie
    return { status: response.status, body, cookie }
  }

  return { start }
}

// The deployed $3 cap, and the $8 cap of NFR-2 that the TRD's first worked example uses.
const SPEND_CAPS = [3, 8]

describe('metering limits, hit through HTTP', () => {
  test('a visitor gets three free runs, and the fourth is refused with a stated message', async () => {
    const { start } = await runtimeWithBudget(1_000, 3)

    const first = await start()
    const second = await start({ cookie: first.cookie })
    const third = await start({ cookie: first.cookie })
    const fourth = await start({ cookie: first.cookie })

    expect([first.status, second.status, third.status]).toEqual([201, 201, 201])
    expect(fourth.status).toBe(429)
    expect(fourth.body.code).toBe('free_limit_reached')
    expect(fourth.body.message).toBeString()
  })

  // docs/TRD.md § Size the daily ceiling: each free run reserves the spend
  // cap, so a ceiling must cover twenty reservations to admit one full wave.
  test.each(SPEND_CAPS)(
    'a ceiling of nineteen $%d reservations refuses the twentieth concurrent free run',
    async (spendCapUsd) => {
      const { start } = await runtimeWithBudget(19 * spendCapUsd, spendCapUsd)

      const statuses: number[] = []
      for (let run = 0; run < 19; run++) statuses.push((await start()).status)
      const twentieth = await start()

      expect(statuses).toEqual(Array(19).fill(201))
      expect(twentieth.status).toBe(429)
      expect(twentieth.body.code).toBe('daily_budget_reached')
      expect(twentieth.body.message).toBeString()
    }
  )

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
    const { start } = await runtimeWithBudget(10, 3)

    const statuses: number[] = []
    for (let run = 0; run < 3; run++) statuses.push((await start()).status)
    const fourth = await start()

    expect(statuses).toEqual([201, 201, 201])
    expect(fourth.body.code).toBe('daily_budget_reached')
  })

  test.each(SPEND_CAPS)(
    "a user's own key still starts runs past both the free allowance and a ceiling of three $%d reservations",
    async (spendCapUsd) => {
      // Three reservations fill the ceiling exactly.
      const { start } = await runtimeWithBudget(3 * spendCapUsd, spendCapUsd)

      const first = await start()
      await start({ cookie: first.cookie })
      await start({ cookie: first.cookie })
      const ceilingHit = await start()
      const freeRunsSpent = await start({ cookie: first.cookie })
      const withKeyAtCeiling = await start({ apiKey: 'sk-visitor-own-key-000000' })
      const withKeyAfterAllowance = await start({ cookie: first.cookie, apiKey: 'sk-visitor-own-key-000000' })

      expect(ceilingHit.body.code).toBe('daily_budget_reached')
      expect(freeRunsSpent.body.code).toBe('free_limit_reached')
      expect(withKeyAtCeiling.status).toBe(201)
      expect(withKeyAfterAllowance.status).toBe(201)
    }
  )
})
