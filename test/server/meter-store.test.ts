import { afterEach, describe, expect, test } from 'bun:test'
import { SQL } from 'bun'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { RUN_CEILING_MS } from '../../src/server/agent-run'
import { SqlMeterStore, usdToMicroUsd, type AdmissionResult, type MeterReservation } from '../../src/server/meter-store'
import { applyMigrations } from '../../src/server/migrations'

const databases: SQL[] = []
const NOW = new Date('2026-09-15T12:00:00.000Z')
// No run outlives its ceiling plus five minutes to export and reconcile (#103).
const RESERVATION_LIFETIME_MS = RUN_CEILING_MS + 5 * 60_000

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()))
})

async function store(ceilingUsd = 100, now: () => Date = () => NOW): Promise<{ database: SQL; store: SqlMeterStore }> {
  const database = new SQL(':memory:')
  databases.push(database)
  await applyMigrations(database)
  return {
    database,
    store: new SqlMeterStore(database, usdToMicroUsd(ceilingUsd), now)
  }
}

function later(ms: number): Date {
  return new Date(NOW.getTime() + ms)
}

// Budget runs in flight hold comes back as they end, so a run held back by it waits (NFR-4).
const BUDGET_RESERVED: AdmissionResult = {
  accepted: false,
  code: 'budget_reserved',
  message: 'Free runs in progress have reserved the rest of the budget, so this run waits for one to finish.'
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

  test('holds back a reservation that crosses the UTC daily ceiling only because of other reservations', async () => {
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

    expect(result).toEqual(BUDGET_RESERVED)
  })

  test("refuses a reservation that the UTC day's spending leaves no room for", async () => {
    const { store: meter } = await store(3)
    const reservation = accepted(
      await meter.admit({ visitorKey: 'visitor-a', reservationMicroUsd: usdToMicroUsd(2), byok: false })
    )
    await meter.reconcile(reservation, usdToMicroUsd(2))

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

  test("refuses the day's first free reservation when its reservation exceeds the daily ceiling", async () => {
    const { store: meter } = await store(2)

    const result = await meter.admit({
      visitorKey: 'visitor-a',
      reservationMicroUsd: usdToMicroUsd(3),
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
    const reservations = await database`SELECT * FROM meter_reservations`
    expect([...visitorUsage]).toEqual([])
    expect([...dailyUsage]).toEqual([])
    expect([...reservations]).toEqual([])
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
    // Only the $1.25 spent still counts, so the rest of the $10 fits exactly.
    const rest = await meter.admit({ visitorKey: 'visitor-b', reservationMicroUsd: usdToMicroUsd(8.75), byok: false })
    expect(rest.accepted).toBe(true)
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
    expect(results.filter((result) => !result.accepted)).toEqual([BUDGET_RESERVED])
  })

  test('stops counting a reservation once no run could still be spending it', async () => {
    let now = NOW
    const { store: meter } = await store(3, () => now)
    accepted(await meter.admit({ visitorKey: 'visitor-a', reservationMicroUsd: usdToMicroUsd(3), byok: false }))

    now = later(RESERVATION_LIFETIME_MS - 1)
    const whileHeld = await meter.admit({ visitorKey: 'visitor-b', reservationMicroUsd: usdToMicroUsd(3), byok: false })
    now = later(RESERVATION_LIFETIME_MS)
    const onceExpired = await meter.admit({
      visitorKey: 'visitor-c',
      reservationMicroUsd: usdToMicroUsd(3),
      byok: false
    })

    expect(whileHeld).toEqual(BUDGET_RESERVED)
    expect(onceExpired.accepted).toBe(true)
  })

  test('admits free runs again once the reservations of a server that died without reconciling them expire', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'layerhand-meter-'))
    const databaseUrl = `sqlite://${join(directory, 'layerhand.db')}`
    const restarted = new SQL(databaseUrl)
    try {
      // The server that dies: three free runs fill a $9 ceiling, and it goes
      // away with none of them reconciled or released.
      const died = new SQL(databaseUrl)
      await applyMigrations(died)
      const before = new SqlMeterStore(died, usdToMicroUsd(9), () => NOW)
      for (const visitorKey of ['visitor-a', 'visitor-b', 'visitor-c']) {
        accepted(await before.admit({ visitorKey, reservationMicroUsd: usdToMicroUsd(3), byok: false }))
      }
      await died.close()

      // The server that replaces it has only the database to go on.
      let now = later(60_000)
      await applyMigrations(restarted)
      const after = new SqlMeterStore(restarted, usdToMicroUsd(9), () => now)
      const soonAfter = await after.admit({
        visitorKey: 'visitor-d',
        reservationMicroUsd: usdToMicroUsd(3),
        byok: false
      })
      now = later(RESERVATION_LIFETIME_MS)
      const onceExpired = await after.admit({
        visitorKey: 'visitor-e',
        reservationMicroUsd: usdToMicroUsd(3),
        byok: false
      })

      expect(soonAfter).toEqual(BUDGET_RESERVED)
      expect(onceExpired.accepted).toBe(true)
    } finally {
      await restarted.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('keeps counting what an earlier revision reserved in the day row', async () => {
    const { database, store: meter } = await store(3)
    // A row as the revision before reservation rows left it: $1 spent, and $1 held by a run still going.
    await database`
      INSERT INTO daily_usage (day_utc, spent_microusd, reserved_microusd)
      VALUES (${'2026-09-15'}, ${usdToMicroUsd(1)}, ${usdToMicroUsd(1)})
    `

    const tooLarge = await meter.admit({ visitorKey: 'visitor-a', reservationMicroUsd: usdToMicroUsd(2), byok: false })
    const fits = await meter.admit({ visitorKey: 'visitor-b', reservationMicroUsd: usdToMicroUsd(1), byok: false })
    const pastSpend = await meter.admit({ visitorKey: 'visitor-c', reservationMicroUsd: usdToMicroUsd(3), byok: false })

    // The $1 it holds comes back when its run ends, so a run it holds back waits.
    expect(tooLarge).toEqual(BUDGET_RESERVED)
    expect(fits.accepted).toBe(true)
    expect(pastSpend).toMatchObject({ accepted: false, code: 'daily_budget_reached' })
  })
})

describe('usdToMicroUsd', () => {
  test('converts dollars without storing floating-point values', () => {
    expect(usdToMicroUsd(3.5)).toBe(3_500_000)
    expect(() => usdToMicroUsd(-1)).toThrow('Dollar amount must be non-negative')
    expect(() => usdToMicroUsd(Number.POSITIVE_INFINITY)).toThrow('Dollar amount must be non-negative')
  })
})
