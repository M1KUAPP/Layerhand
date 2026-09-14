import type { SQL, TransactionSQL } from 'bun'

const FREE_RUN_LIMIT = 3

export interface AdmissionRequest {
  visitorKey: string
  reservationMicroUsd: number
  byok: boolean
}

export interface MeterReservation {
  readonly visitorKey: string
  readonly dayUtc: string
  readonly reservedMicroUsd: number
  readonly freeTier: boolean
}

export type AdmissionResult =
  | { accepted: true; reservation: MeterReservation }
  | {
      accepted: false
      code: 'free_limit_reached' | 'daily_budget_reached'
      message: string
    }

export interface MeterStore {
  admit(request: AdmissionRequest): Promise<AdmissionResult>
  reconcile(reservation: MeterReservation, actualMicroUsd: number): Promise<void>
  release(reservation: MeterReservation): Promise<void>
}

class AdmissionDenied extends Error {
  readonly result: Exclude<AdmissionResult, { accepted: true }>

  constructor(result: Exclude<AdmissionResult, { accepted: true }>) {
    super(result.code)
    this.result = result
  }
}

const FREE_LIMIT: Exclude<AdmissionResult, { accepted: true }> = {
  accepted: false,
  code: 'free_limit_reached',
  message: 'You have used all three free Layerhand runs.'
}

const DAILY_LIMIT: Exclude<AdmissionResult, { accepted: true }> = {
  accepted: false,
  code: 'daily_budget_reached',
  message: "Today's free-run budget is used up. Add your own OpenAI API key to continue."
}

function assertMicroUsd(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be non-negative`)
}

export function usdToMicroUsd(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) throw new Error('Dollar amount must be non-negative')
  const microUsd = Math.round(usd * 1_000_000)
  assertMicroUsd(microUsd, 'Dollar amount')
  return microUsd
}

export class SqlMeterStore implements MeterStore {
  readonly #database: SQL
  readonly #dailyCeilingMicroUsd: number
  readonly #now: () => Date
  readonly #active = new WeakSet<MeterReservation>()
  #transactionTail: Promise<void> = Promise.resolve()

  constructor(database: SQL, dailyCeilingMicroUsd: number, now: () => Date = () => new Date()) {
    assertMicroUsd(dailyCeilingMicroUsd, 'Daily ceiling')
    if (dailyCeilingMicroUsd === 0) throw new Error('Daily ceiling must be positive')
    this.#database = database
    this.#dailyCeilingMicroUsd = dailyCeilingMicroUsd
    this.#now = now
  }

  async admit(request: AdmissionRequest): Promise<AdmissionResult> {
    assertMicroUsd(request.reservationMicroUsd, 'Reservation')
    if (request.reservationMicroUsd === 0) throw new Error('Reservation must be positive')
    const reservation: MeterReservation = {
      visitorKey: request.visitorKey,
      dayUtc: this.#now().toISOString().slice(0, 10),
      reservedMicroUsd: request.byok ? 0 : request.reservationMicroUsd,
      freeTier: !request.byok
    }

    if (!reservation.freeTier) {
      this.#active.add(reservation)
      return { accepted: true, reservation }
    }

    try {
      await this.#inTransaction(async (transaction) => {
        const visitors = await transaction`
          INSERT INTO visitor_usage (visitor_key, accepted_free_runs)
          VALUES (${reservation.visitorKey}, 1)
          ON CONFLICT (visitor_key) DO UPDATE SET
            accepted_free_runs = visitor_usage.accepted_free_runs + 1
          WHERE visitor_usage.accepted_free_runs < ${FREE_RUN_LIMIT}
          RETURNING accepted_free_runs
        `
        if (visitors.length === 0) throw new AdmissionDenied(FREE_LIMIT)

        const days = await transaction`
          INSERT INTO daily_usage (day_utc, spent_microusd, reserved_microusd)
          VALUES (${reservation.dayUtc}, 0, ${reservation.reservedMicroUsd})
          ON CONFLICT (day_utc) DO UPDATE SET
            reserved_microusd = daily_usage.reserved_microusd + ${reservation.reservedMicroUsd}
          WHERE daily_usage.spent_microusd + daily_usage.reserved_microusd
            + ${reservation.reservedMicroUsd} <= ${this.#dailyCeilingMicroUsd}
          RETURNING reserved_microusd
        `
        if (days.length === 0) throw new AdmissionDenied(DAILY_LIMIT)
      })
    } catch (error) {
      if (error instanceof AdmissionDenied) return error.result
      throw error
    }

    this.#active.add(reservation)
    return { accepted: true, reservation }
  }

  async reconcile(reservation: MeterReservation, actualMicroUsd: number): Promise<void> {
    assertMicroUsd(actualMicroUsd, 'Actual cost')
    if (!this.#claim(reservation) || !reservation.freeTier) return
    try {
      await this.#database`
        UPDATE daily_usage SET
          reserved_microusd = reserved_microusd - ${reservation.reservedMicroUsd},
          spent_microusd = spent_microusd + ${actualMicroUsd}
        WHERE day_utc = ${reservation.dayUtc}
          AND reserved_microusd >= ${reservation.reservedMicroUsd}
      `
    } catch (error) {
      this.#active.add(reservation)
      throw error
    }
  }

  async release(reservation: MeterReservation): Promise<void> {
    if (!this.#claim(reservation) || !reservation.freeTier) return
    try {
      await this.#inTransaction(async (transaction) => {
        await transaction`
          UPDATE visitor_usage SET accepted_free_runs = accepted_free_runs - 1
          WHERE visitor_key = ${reservation.visitorKey} AND accepted_free_runs > 0
        `
        await transaction`
          UPDATE daily_usage SET reserved_microusd = reserved_microusd - ${reservation.reservedMicroUsd}
          WHERE day_utc = ${reservation.dayUtc}
            AND reserved_microusd >= ${reservation.reservedMicroUsd}
        `
      })
    } catch (error) {
      this.#active.add(reservation)
      throw error
    }
  }

  #claim(reservation: MeterReservation): boolean {
    if (!this.#active.has(reservation)) return false
    this.#active.delete(reservation)
    return true
  }

  #inTransaction<T>(operation: (transaction: TransactionSQL) => Promise<T>): Promise<T> {
    const result = this.#transactionTail.then(() => this.#database.begin(operation)) as Promise<T>
    this.#transactionTail = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }
}
