import { afterEach, describe, expect, test } from 'bun:test'
import { SQL } from 'bun'

import { databaseReady } from '../../src/server/database'
import { applyMigrations } from '../../src/server/migrations'

const databases: SQL[] = []

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()))
})

function memoryDatabase(): SQL {
  const database = new SQL(':memory:')
  databases.push(database)
  return database
}

async function expectConstraint(promise: Promise<unknown>): Promise<void> {
  let rejected = false
  try {
    await promise
  } catch {
    rejected = true
  }
  expect(rejected).toBe(true)
}

describe('launch persistence migrations', () => {
  test('create the focused tables and can be applied twice', async () => {
    const database = memoryDatabase()

    await applyMigrations(database)
    await applyMigrations(database)

    const tables = await database`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `
    expect(tables.map((row: { name: string }) => row.name)).toEqual([
      'address_usage',
      'daily_usage',
      'meter_reservations',
      'run_log',
      'visitor_usage',
      'waitlist_emails'
    ])
  })

  test('enforces non-negative integer usage and unique waitlist emails', async () => {
    const database = memoryDatabase()
    await applyMigrations(database)

    await expectConstraint(
      database`INSERT INTO visitor_usage (visitor_key, accepted_free_runs) VALUES (${'visitor'}, ${-1})`
    )
    await expectConstraint(
      database`INSERT INTO address_usage (address_key, day_utc, accepted_free_runs) VALUES (${'address'}, ${'2026-09-15'}, ${-1})`
    )
    await expectConstraint(
      database`INSERT INTO daily_usage (day_utc, spent_microusd, reserved_microusd) VALUES (${'2026-09-15'}, ${0}, ${-1})`
    )
    await expectConstraint(
      database`INSERT INTO meter_reservations (reservation_id, day_utc, reserved_microusd, reserved_at) VALUES (${'reservation'}, ${'2026-09-15'}, ${0}, ${'2026-09-15T00:00:00.000Z'})`
    )
    await database`INSERT INTO waitlist_emails (email, created_at) VALUES (${'Ada@Example.com'}, ${'2026-09-15T00:00:00.000Z'})`
    await expectConstraint(
      database`INSERT INTO waitlist_emails (email, created_at) VALUES (${'Ada@Example.com'}, ${'2026-09-15T00:00:01.000Z'})`
    )
  })

  test('reports readiness without returning database contents', async () => {
    const database = memoryDatabase()

    expect(await databaseReady(database)).toBe(true)
    await database.close()
    expect(await databaseReady(database)).toBe(false)
    databases.splice(databases.indexOf(database), 1)
  })
})
