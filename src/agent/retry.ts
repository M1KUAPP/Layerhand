// How long a model call that went unanswered waits before it is sent again
// (#104, docs/TRD.md § The loop). Rate limits are likely when many runs share
// one organisation's tokens a minute, so the waits spread runs apart rather
// than sending them back together.

const MAX_RETRIES = 6
const FIRST_WAIT_MS = 1_000
const MAX_WAIT_MS = 30_000

/**
 * The wait before the retry that follows `retries` earlier ones, or undefined
 * when there should be none: the retries have run out, or the server asked for
 * a longer wait than any retry makes. The backoff doubles from one second up
 * to thirty. The wait is half of it, or the server's `retry-after` when that
 * is longer, plus up to the other half by `random`, from 0 up to 1, so runs
 * told the same wait still come back apart. It never passes thirty seconds.
 */
export function retryWaitMs(retries: number, retryAfterMs: number | undefined, random: number): number | undefined {
  if (retries >= MAX_RETRIES || (retryAfterMs ?? 0) > MAX_WAIT_MS) return undefined
  const half = Math.min(MAX_WAIT_MS, FIRST_WAIT_MS * 2 ** retries) / 2
  return Math.min(MAX_WAIT_MS, Math.max(retryAfterMs ?? 0, half) + half * random)
}

/** A `retry-after` header in milliseconds, given in seconds or as an HTTP date. Undefined when absent or unreadable. */
export function retryAfterMs(header: string | null, now: number): number | undefined {
  const value = header?.trim()
  if (!value) return undefined
  if (/^\d+$/.test(value)) return Number(value) * 1_000
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - now)
}

/** Resolves once `ms` have passed, or rejects with the signal's reason once it aborts. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
