import type { SQL } from 'bun'

export async function applyMigrations(database: SQL): Promise<void> {
  await database`
    CREATE TABLE IF NOT EXISTS visitor_usage (
      visitor_key TEXT PRIMARY KEY,
      accepted_free_runs INTEGER NOT NULL DEFAULT 0
        CHECK (accepted_free_runs >= 0)
    )
  `
  // The address's own count, independent of visitor_usage's cookie-mixed
  // key, so a fresh cookie does not also reset what this address has
  // already used (#115).
  await database`
    CREATE TABLE IF NOT EXISTS address_usage (
      address_key TEXT PRIMARY KEY,
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
  // A row for each free run's reservation, with the time it was made, so one
  // that nothing gave back stops counting once no run could still hold it.
  await database`
    CREATE TABLE IF NOT EXISTS meter_reservations (
      reservation_id TEXT PRIMARY KEY,
      day_utc TEXT NOT NULL,
      reserved_microusd BIGINT NOT NULL
        CHECK (reserved_microusd > 0),
      reserved_at TEXT NOT NULL
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
  // Added once databases already existed, so an existing table gains it too.
  // SQLite and Postgres both lack a portable IF NOT EXISTS for a column.
  try {
    await database`ALTER TABLE run_log ADD COLUMN failure_code TEXT`
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error instanceof Error ? error.message : String(error))) throw error
  }
  // Added the same way, for the same reason: a run's transport, how its
  // corrections settled, and the safety checks it acknowledged (NFR-8, #108).
  try {
    await database`ALTER TABLE run_log ADD COLUMN transport TEXT`
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error instanceof Error ? error.message : String(error))) throw error
  }
  try {
    await database`ALTER TABLE run_log ADD COLUMN corrections_applied INTEGER`
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error instanceof Error ? error.message : String(error))) throw error
  }
  try {
    await database`ALTER TABLE run_log ADD COLUMN corrections_replayed INTEGER`
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error instanceof Error ? error.message : String(error))) throw error
  }
  try {
    await database`ALTER TABLE run_log ADD COLUMN corrections_indeterminate INTEGER`
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error instanceof Error ? error.message : String(error))) throw error
  }
  try {
    await database`ALTER TABLE run_log ADD COLUMN safety_check_codes TEXT`
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error instanceof Error ? error.message : String(error))) throw error
  }
  // Added the same way, for the same reason: how many actions a run refused
  // for typing Photopea's scripting interface through the computer tool (#109).
  try {
    await database`ALTER TABLE run_log ADD COLUMN refused_actions INTEGER`
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error instanceof Error ? error.message : String(error))) throw error
  }
}
