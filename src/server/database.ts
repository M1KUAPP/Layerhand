import { SQL } from 'bun'

export function createDatabase(databaseUrl: string): SQL {
  return new SQL(databaseUrl)
}

export async function databaseReady(database: SQL): Promise<boolean> {
  try {
    await database`SELECT 1 AS ready`
    return true
  } catch {
    return false
  }
}
