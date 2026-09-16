import type { SQL, TransactionSQL } from 'bun'

const FREE_RUN_LIMIT = 3

/**
 * How long a free run's reservation counts against the day's budget: the
 * fifteen-minute run ceiling (`RUN_CEILING_MS`), plus five minutes for a run
 * stopped there to export, give up its browser and be reconciled. No run is
 * still spending after that, so an older reservation is one its server never
 * gave back, because it crashed or was stopped first (#103).
 */
const RESERVATION_LIFETIME_MS = 15 * 60_000 + 5 * 60_000

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
      /**
       * `budget_reserved` is a run that would fit what the day has spent, and
       * is held back only by what runs in flight reserved, which comes back
       * as they end. It waits for that rather than being refused (NFR-4).
       */
      code: 'free_limit_reached' | 'daily_budget_reached' | 'budget_reserved'
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

const BUDGET_RESERVED: Exclude<AdmissionResult, { accepted: true }> = {
  accepted: false,
  code: 'budget_reserved',
  message: 'Free runs in progress have reserved the rest of the budget, so this run waits for one to finish.'
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
  /** Each free reservation not yet given back, with the id of its row. */
  readonly #active = new WeakMap<MeterReservation, string>()
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
    const now = this.#now()
    const reservation: MeterReservation = {
      visitorKey: request.visitorKey,
      dayUtc: now.toISOString().slice(0, 10),
      reservedMicroUsd: request.byok ? 0 : request.reservationMicroUsd,
      freeTier: !request.byok
    }

    // A run on the user's own key reserves nothing, so it has nothing to give back.
    if (!reservation.freeTier) return { accepted: true, reservation }

    const reservationId = crypto.randomUUID()
    const liveSince = new Date(now.getTime() - RESERVATION_LIFETIME_MS).toISOString()
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

        // Writing the day's row holds it until this transaction ends, so
        // admissions to one day take turns, and the check that follows counts
        // every reservation made before this one.
        await transaction`
          INSERT INTO daily_usage (day_utc, spent_microusd, reserved_microusd)
          VALUES (${reservation.dayUtc}, 0, 0)
          ON CONFLICT (day_utc) DO UPDATE SET spent_microusd = daily_usage.spent_microusd
        `
        // The row's reserved_microusd is what revisions from before
        // meter_reservations reserved. Nothing adds to it now, but runs of
        // theirs still in flight give it back, so it still counts.
        const days = await transaction`
          SELECT day_utc FROM daily_usage
          WHERE day_utc = ${reservation.dayUtc}
            AND daily_usage.spent_microusd + daily_usage.reserved_microusd + (
              SELECT COALESCE(SUM(meter_reservations.reserved_microusd), 0) FROM meter_reservations
              WHERE meter_reservations.day_utc = ${reservation.dayUtc}
                AND meter_reservations.reserved_at > ${liveSince}
            ) + ${reservation.reservedMicroUsd} <= ${this.#dailyCeilingMicroUsd}
        `
        if (days.length === 0) {
          // Reservations come back as their runs end; spending does not.
          const unreserved = await transaction`
            SELECT day_utc FROM daily_usage
            WHERE day_utc = ${reservation.dayUtc}
              AND daily_usage.spent_microusd + ${reservation.reservedMicroUsd} <= ${this.#dailyCeilingMicroUsd}
          `
          throw new AdmissionDenied(unreserved.length > 0 ? BUDGET_RESERVED : DAILY_LIMIT)
        }

        await transaction`
          INSERT INTO meter_reservations (reservation_id, day_utc, reserved_microusd, reserved_at)
          VALUES (${reservationId}, ${reservation.dayUtc}, ${reservation.reservedMicroUsd}, ${now.toISOString()})
        `
      })
    } catch (error) {
      if (error instanceof AdmissionDenied) return error.result
      throw error
    }

    this.#active.set(reservation, reservationId)
    return { accepted: true, reservation }
  }

  async reconcile(reservation: MeterReservation, actualMicroUsd: number): Promise<void> {
    assertMicroUsd(actualMicroUsd, 'Actual cost')
    const reservationId = this.#claim(reservation)
    if (reservationId === undefined) return
    try {
      // The measured spend replaces the reservation in one transaction.
      await this.#inTransaction(async (transaction) => {
        await transaction`
          UPDATE daily_usage SET spent_microusd = spent_microusd + ${actualMicroUsd}
          WHERE day_utc = ${reservation.dayUtc}
        `
        await transaction`DELETE FROM meter_reservations WHERE reservation_id = ${reservationId}`
      })
    } catch (error) {
      this.#active.set(reservation, reservationId)
      throw error
    }
  }

  async release(reservation: MeterReservation): Promise<void> {
    const reservationId = this.#claim(reservation)
    if (reservationId === undefined) return
    try {
      await this.#inTransaction(async (transaction) => {
        await transaction`
          UPDATE visitor_usage SET accepted_free_runs = accepted_free_runs - 1
          WHERE visitor_key = ${reservation.visitorKey} AND accepted_free_runs > 0
        `
        await transaction`DELETE FROM meter_reservations WHERE reservation_id = ${reservationId}`
      })
    } catch (error) {
      this.#active.set(reservation, reservationId)
      throw error
    }
  }

  /** The row of a reservation not yet given back, once: a second call finds nothing. */
  #claim(reservation: MeterReservation): string | undefined {
    const reservationId = this.#active.get(reservation)
    this.#active.delete(reservation)
    return reservationId
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
