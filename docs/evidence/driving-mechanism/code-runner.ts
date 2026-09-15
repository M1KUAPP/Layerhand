// Runs the `run_code` tool's JavaScript against the Playwright page, as the
// computer-use guide's code-execution loop does. The code runs unsandboxed in
// this process, which is acceptable for a local spike and not for production.
import type { Page } from 'playwright-core'

import type { CodeResult, CodeRunner } from '../../../src/agent/responses-model'

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...parameters: string[]
) => (...values: unknown[]) => Promise<unknown>

const MAX_LOG_CHARACTERS = 4_000

export function pageCodeRunner(page: Page, timeoutMs = 60_000): CodeRunner {
  return {
    async run(code: string, signal: AbortSignal): Promise<CodeResult> {
      const logs: string[] = []
      let logged = 0
      const console = {
        log: (...values: unknown[]) => {
          const line = values.map((value) => (typeof value === 'string' ? value : Bun.inspect(value))).join(' ')
          if (logged < MAX_LOG_CHARACTERS) logs.push(line.slice(0, MAX_LOG_CHARACTERS - logged))
          logged += line.length
        }
      }
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const running = new AsyncFunction('page', 'console', code)(page, console)
        const timedOut = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error(`The code ran for more than ${timeoutMs} ms`)), timeoutMs)
          signal.addEventListener('abort', () => reject(new Error('The run was cancelled')), { once: true })
        })
        await Promise.race([running, timedOut])
        return { logs }
      } catch (error) {
        return { logs, error: error instanceof Error ? error.message : String(error) }
      } finally {
        clearTimeout(timer)
      }
    }
  }
}
