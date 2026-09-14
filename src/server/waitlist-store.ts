import type { SQL } from 'bun'

const MAX_EMAIL_LENGTH = 254
const MAX_LOCAL_LENGTH = 64
const LOCAL_PATTERN = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/

export interface WaitlistEntry {
  email: string
  createdAt: string
}

export interface WaitlistAddResult {
  email: string
  created: boolean
}

export interface WaitlistStore {
  add(email: string, createdAt: string): Promise<WaitlistAddResult>
  list(): Promise<WaitlistEntry[]>
}

export class WaitlistEmailError extends Error {
  readonly code = 'invalid_email' as const

  constructor() {
    super('Enter a valid email address.')
    this.name = 'WaitlistEmailError'
  }
}

export function normalizeWaitlistEmail(input: string): string {
  const email = input.trim()
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) throw new WaitlistEmailError()
  const separator = email.lastIndexOf('@')
  if (separator <= 0 || separator !== email.indexOf('@')) throw new WaitlistEmailError()

  const local = email.slice(0, separator)
  const domain = email.slice(separator + 1)
  if (
    local.length > MAX_LOCAL_LENGTH ||
    !LOCAL_PATTERN.test(local) ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..')
  ) {
    throw new WaitlistEmailError()
  }

  const labels = domain.split('.')
  if (labels.length < 2 || labels.some((label) => !DOMAIN_LABEL_PATTERN.test(label))) {
    throw new WaitlistEmailError()
  }
  return `${local}@${domain.toLowerCase()}`
}

export class SqlWaitlistStore implements WaitlistStore {
  readonly #database: SQL

  constructor(database: SQL) {
    this.#database = database
  }

  async add(email: string, createdAt: string): Promise<WaitlistAddResult> {
    const normalized = normalizeWaitlistEmail(email)
    const rows = await this.#database`
      INSERT INTO waitlist_emails (email, created_at)
      VALUES (${normalized}, ${createdAt})
      ON CONFLICT (email) DO NOTHING
      RETURNING email
    `
    return { email: normalized, created: rows.length === 1 }
  }

  async list(): Promise<WaitlistEntry[]> {
    const rows = await this.#database`
      SELECT email, created_at
      FROM waitlist_emails
      ORDER BY created_at, email
    `
    return rows.map((row: { email: string; created_at: string }) => ({
      email: row.email,
      createdAt: row.created_at
    }))
  }
}

export class MemoryWaitlistStore implements WaitlistStore {
  readonly #entries = new Map<string, WaitlistEntry>()

  async add(email: string, createdAt: string): Promise<WaitlistAddResult> {
    const normalized = normalizeWaitlistEmail(email)
    if (this.#entries.has(normalized)) return { email: normalized, created: false }
    this.#entries.set(normalized, { email: normalized, createdAt })
    return { email: normalized, created: true }
  }

  async list(): Promise<WaitlistEntry[]> {
    return [...this.#entries.values()].sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt) || left.email.localeCompare(right.email)
    )
  }
}
