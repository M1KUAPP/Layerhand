import type { SQL } from 'bun'

export async function applyMigrations(database: SQL): Promise<void> {
  await database`
    CREATE TABLE IF NOT EXISTS visitor_usage (
      visitor_key TEXT PRIMARY KEY,
      accepted_free_runs INTEGER NOT NULL DEFAULT 0
        CHECK (accepted_free_runs >= 0)
    )
  `
  await database`
    CREATE TABLE IF NOT EXISTS daily_usage (
      day_utc TEXT PRIMARY KEY,
      spent_microusd BIGINT NOT NULL DEFAULT 0
        CHECK (spent_microusd >= 0),
      reserved_microusd BIGINT NOT NULL DEFAULT 0
        CHECK (reserved_microusd >= 0)
    )
  `
  await database`
    CREATE TABLE IF NOT EXISTS waitlist_emails (
      email TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    )
  `
}
