import web from '../../../src/web/index.html'
import { pageRoutes } from '../../../src/server/page-routes'
import { MAX_RUN_REQUEST_BODY_BYTES } from '../../../src/server/run-routes'
import { createLaunchRuntime } from '../../../src/server/runtime'

export interface TestApplicationOptions {
  fakeRunIntervalMs?: number
  stepCap?: number
  maxConcurrentRuns?: number
}

export async function startTestApplication(options: TestApplicationOptions = {}) {
  let server: ReturnType<typeof Bun.serve> | undefined
  const runtime = await createLaunchRuntime({
    env: {
      NODE_ENV: 'development',
      ...(options.maxConcurrentRuns === undefined ? {} : { MAX_CONCURRENT_RUNS: String(options.maxConcurrentRuns) })
    },
    clientAddress(request) {
      return server?.requestIP(request)?.address ?? '127.0.0.1'
    },
    fakeRunIntervalMs: options.fakeRunIntervalMs ?? 1_000,
    stepCap: options.stepCap
  })
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    maxRequestBodySize: MAX_RUN_REQUEST_BODY_BYTES,
    routes: await pageRoutes(web),
    fetch: runtime.application.fetch
  })

  return {
    origin: server.url.origin,
    async close() {
      await server?.stop(true)
      await runtime.close()
    }
  }
}
