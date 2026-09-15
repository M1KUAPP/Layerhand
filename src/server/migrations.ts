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
  await database`
    CREATE TABLE IF NOT EXISTS run_log (
      run_id TEXT PRIMARY KEY,
      completed_at TEXT NOT NULL,
      steps INTEGER NOT NULL,
      cap_hit BOOLEAN NOT NULL,
      tokens_in BIGINT NOT NULL,
      tokens_out BIGINT NOT NULL,
      cost_usd DOUBLE PRECISION NOT NULL,
      cache_hit_rate DOUBLE PRECISION,
      duration_ms BIGINT NOT NULL,
      outcome TEXT NOT NULL,
      failure_reason TEXT,
      instruction TEXT NOT NULL
    )
  `
}
