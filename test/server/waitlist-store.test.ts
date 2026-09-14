import { afterEach, describe, expect, test } from 'bun:test'
import { SQL } from 'bun'

import { applyMigrations } from '../../src/server/migrations'
import { formatWaitlistCsv } from '../../src/server/waitlist-export'
import { SqlWaitlistStore, WaitlistEmailError, normalizeWaitlistEmail } from '../../src/server/waitlist-store'

const databases: SQL[] = []

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()))
})

async function store(): Promise<SqlWaitlistStore> {
  const database = new SQL(':memory:')
  databases.push(database)
  await applyMigrations(database)
  return new SqlWaitlistStore(database)
}

describe('normalizeWaitlistEmail', () => {
  test('trims whitespace and lowercases only the domain', () => {
    expect(normalizeWaitlistEmail('  Ada.Lovelace@Example.COM  ')).toBe('Ada.Lovelace@example.com')
  })

  test.each([
    '',
    'missing-at.example.com',
    '@example.com',
    'person@',
    '.person@example.com',
    'person..name@example.com',
    'person@-example.com',
    'person@example',
    `${'a'.repeat(65)}@example.com`,
    `${'a'.repeat(245)}@example.com`
  ])('rejects malformed or oversized value %s', (value) => {
    expect(() => normalizeWaitlistEmail(value)).toThrow(WaitlistEmailError)
  })
})

describe('SqlWaitlistStore', () => {
  test('persists normalized addresses in stable creation order', async () => {
    const waitlist = await store()

    const first = await waitlist.add('  Ada@Example.COM ', '2026-09-15T00:00:00.000Z')
    const second = await waitlist.add('Grace@example.com', '2026-09-15T00:00:01.000Z')

    expect(first).toEqual({ email: 'Ada@example.com', created: true })
    expect(second).toEqual({ email: 'Grace@example.com', created: true })
    expect(await waitlist.list()).toEqual([
      { email: 'Ada@example.com', createdAt: '2026-09-15T00:00:00.000Z' },
      { email: 'Grace@example.com', createdAt: '2026-09-15T00:00:01.000Z' }
    ])
  })

  test('treats duplicate submissions as idempotent success', async () => {
    const waitlist = await store()
    await waitlist.add('Ada@example.com', '2026-09-15T00:00:00.000Z')

    const duplicate = await waitlist.add(' Ada@EXAMPLE.COM ', '2026-09-15T00:00:01.000Z')

    expect(duplicate).toEqual({ email: 'Ada@example.com', created: false })
    expect(await waitlist.list()).toEqual([{ email: 'Ada@example.com', createdAt: '2026-09-15T00:00:00.000Z' }])
  })
})

describe('formatWaitlistCsv', () => {
  test('writes stable RFC 4180 CSV including escaped fields', () => {
    expect(formatWaitlistCsv([{ email: 'quote"comma,@example.com', createdAt: '2026-09-15T00:00:00.000Z' }])).toBe(
      'email,created_at\r\n"quote""comma,@example.com",2026-09-15T00:00:00.000Z\r\n'
    )
  })
})
