import { afterEach, describe, expect, test } from 'bun:test'
import { SQL } from 'bun'

import { SqlMeterStore, usdToMicroUsd, type AdmissionResult, type MeterReservation } from '../../src/server/meter-store'
import { applyMigrations } from '../../src/server/migrations'

const databases: SQL[] = []
const NOW = new Date('2026-09-15T12:00:00.000Z')

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()))
})

async function store(ceilingUsd = 100): Promise<{ database: SQL; store: SqlMeterStore }> {
  const database = new SQL(':memory:')
  databases.push(database)
  await applyMigrations(database)
  return {
    database,
    store: new SqlMeterStore(database, usdToMicroUsd(ceilingUsd), () => NOW)
  }
}

function accepted(result: AdmissionResult): MeterReservation {
  if (!result.accepted) throw new Error(`Expected admission, received ${result.code}`)
  return result.reservation
}

describe('SqlMeterStore', () => {
  test('accepts three free runs and refuses the fourth with a stated message', async () => {
    const { store: meter } = await store()

    for (let run = 0; run < 3; run += 1) {
      const result = await meter.admit({
        visitorKey: 'visitor-a',
        reservationMicroUsd: usdToMicroUsd(1),
        byok: false
      })
      expect(result.accepted).toBe(true)
    }
    const fourth = await meter.admit({
      visitorKey: 'visitor-a',
      reservationMicroUsd: usdToMicroUsd(1),
      byok: false
    })

    expect(fourth).toEqual({
      accepted: false,
      code: 'free_limit_reached',
      message: 'You have used all three free Layerhand runs.'
    })
  })

  test('refuses a reservation that would cross the UTC daily ceiling', async () => {
    const { store: meter } = await store(3)
    accepted(
      await meter.admit({
        visitorKey: 'visitor-a',
        reservationMicroUsd: usdToMicroUsd(2),
        byok: false
      })
    )

    const result = await meter.admit({
      visitorKey: 'visitor-b',
      reservationMicroUsd: usdToMicroUsd(2),
      byok: false
    })

    expect(result).toEqual({
      accepted: false,
      code: 'daily_budget_reached',
      message: "Today's free-run budget is used up. Add your own OpenAI API key to continue."
    })
  })

  test('lets BYOK runs bypass free and daily admission without database usage', async () => {
    const { database, store: meter } = await store(1)
    const first = await meter.admit({
      visitorKey: 'visitor-a',
      reservationMicroUsd: usdToMicroUsd(5),
      byok: true
    })
    const second = await meter.admit({
      visitorKey: 'visitor-a',
      reservationMicroUsd: usdToMicroUsd(5),
      byok: true
    })

    expect(accepted(first).freeTier).toBe(false)
    expect(accepted(second).freeTier).toBe(false)
    const visitorUsage = await database`SELECT * FROM visitor_usage`
    const dailyUsage = await database`SELECT * FROM daily_usage`
    expect([...visitorUsage]).toEqual([])
    expect([...dailyUsage]).toEqual([])
  })

  test('reconciles reserved cost to measured cost exactly once', async () => {
    const { database, store: meter } = await store(10)
    const reservation = accepted(
      await meter.admit({
        visitorKey: 'visitor-a',
        reservationMicroUsd: usdToMicroUsd(4),
        byok: false
      })
    )

    await meter.reconcile(reservation, usdToMicroUsd(1.25))
    await meter.reconcile(reservation, usdToMicroUsd(9))

    const usage = await database`SELECT spent_microusd, reserved_microusd FROM daily_usage`
    expect([...usage]).toEqual([{ spent_microusd: 1_250_000, reserved_microusd: 0 }])
  })

  test('releases failed starts so allowance and reservation are reusable', async () => {
    const { database, store: meter } = await store(1)
    const reservation = accepted(
      await meter.admit({
        visitorKey: 'visitor-a',
        reservationMicroUsd: usdToMicroUsd(1),
        byok: false
      })
    )

    await meter.release(reservation)
    await meter.release(reservation)

    const visitors = await database`SELECT accepted_free_runs FROM visitor_usage`
    expect([...visitors]).toEqual([{ accepted_free_runs: 0 }])
    const usage = await database`SELECT spent_microusd, reserved_microusd FROM daily_usage`
    expect([...usage]).toEqual([{ spent_microusd: 0, reserved_microusd: 0 }])
    expect(
      (
        await meter.admit({
          visitorKey: 'visitor-a',
          reservationMicroUsd: usdToMicroUsd(1),
          byok: false
        })
      ).accepted
    ).toBe(true)
  })

  test('serializes concurrent reservations at the daily ceiling', async () => {
    const { store: meter } = await store(3)

    const results = await Promise.all([
      meter.admit({
        visitorKey: 'visitor-a',
        reservationMicroUsd: usdToMicroUsd(2),
        byok: false
      }),
      meter.admit({
        visitorKey: 'visitor-b',
        reservationMicroUsd: usdToMicroUsd(2),
        byok: false
      })
    ])

    expect(results.filter((result) => result.accepted)).toHaveLength(1)
    expect(results.filter((result) => !result.accepted)).toEqual([
      {
        accepted: false,
        code: 'daily_budget_reached',
        message: "Today's free-run budget is used up. Add your own OpenAI API key to continue."
      }
    ])
  })
})

describe('usdToMicroUsd', () => {
  test('converts dollars without storing floating-point values', () => {
    expect(usdToMicroUsd(3.5)).toBe(3_500_000)
    expect(() => usdToMicroUsd(-1)).toThrow('Dollar amount must be non-negative')
    expect(() => usdToMicroUsd(Number.POSITIVE_INFINITY)).toThrow('Dollar amount must be non-negative')
  })
})
