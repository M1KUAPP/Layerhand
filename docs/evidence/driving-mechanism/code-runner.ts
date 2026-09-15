// Runs the `run_code` tool's JavaScript against the Playwright page, as the
// computer-use guide's code-execution loop does. The code runs unsandboxed in
// this process, which is acceptable for a local spike and not for production.
import type { Page } from 'playwright-core'

import type { CodeResult, CodeRunner } from '../../../src/agent/responses-model'

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...parameters: string[]
) => (...values: unknown[]) => Promise<unknown>

const MAX_LOG_CHARACTERS = 4_000

/**
 * Wraps the page, and every object reached through it, so that each call
 * throws once `expired()` is true. A body that outlives its step can keep
 * running, but it can no longer change the page.
 */
function expiring<T extends object>(target: T, expired: () => boolean, seen = new WeakMap<object, object>()): T {
  const known = seen.get(target)
  if (known) return known as T
  const proxy = new Proxy(target, {
    get(object, property) {
      const value: unknown = Reflect.get(object, property, object)
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          if (expired()) throw new Error('This step has ended, so the page can no longer be changed')
          return value.apply(object, args)
        }
      }
      return value !== null && typeof value === 'object' ? expiring(value, expired, seen) : value
    }
  })
  seen.set(target, proxy)
  return proxy
}

export function pageCodeRunner(page: Page, timeoutMs = 60_000): CodeRunner {
  return {
    async run(code: string, signal: AbortSignal): Promise<CodeResult> {
      const logs: string[] = []
      let logged = 0
      let ended = false
      const console = {
        log: (...values: unknown[]) => {
          const line = values.map((value) => (typeof value === 'string' ? value : Bun.inspect(value))).join(' ')
          if (logged < MAX_LOG_CHARACTERS) logs.push(line.slice(0, MAX_LOG_CHARACTERS - logged))
          logged += line.length
        }
      }
      let timer: ReturnType<typeof setTimeout> | undefined
      let onAbort: (() => void) | undefined
      try {
        const running = new AsyncFunction('page', 'console', code)(
          expiring(page, () => ended),
          console
        )
        // Once the race settles, a late rejection from the body is nobody's to handle.
        running.catch(() => undefined)
        const stopped = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error(`The code ran for more than ${timeoutMs} ms`)), timeoutMs)
          onAbort = () => reject(new Error('The run was cancelled'))
          signal.addEventListener('abort', onAbort, { once: true })
        })
        stopped.catch(() => undefined)
        await Promise.race([running, stopped])
        return { logs }
      } catch (error) {
        return { logs, error: error instanceof Error ? error.message : String(error) }
      } finally {
        ended = true
        clearTimeout(timer)
        if (onAbort) signal.removeEventListener('abort', onAbort)
      }
    }
  }
}
