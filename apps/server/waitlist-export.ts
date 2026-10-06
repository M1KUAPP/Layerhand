import { createDatabase } from './database'
import { applyMigrations } from './migrations'
import { SqlWaitlistStore, type WaitlistEntry } from './waitlist-store'

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function formatWaitlistCsv(entries: readonly WaitlistEntry[]): string {
  const rows = entries.map(({ email, createdAt }) => `${csvField(email)},${csvField(createdAt)}\r\n`)
  return `email,created_at\r\n${rows.join('')}`
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')
  const database = createDatabase(databaseUrl)
  try {
    await applyMigrations(database)
    const entries = await new SqlWaitlistStore(database).list()
    process.stdout.write(formatWaitlistCsv(entries))
  } finally {
    await database.close()
  }
}

if (import.meta.main) await main()
