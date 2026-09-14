import web from '../web/index.html'
import { MAX_RUN_REQUEST_BODY_BYTES } from './run-routes'
import { createLaunchRuntime } from './runtime'

let server: ReturnType<typeof Bun.serve> | undefined
let closing = false

const runtime = await createLaunchRuntime({
  clientAddress(request) {
    return server?.requestIP(request)?.address ?? '0.0.0.0'
  }
})

server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  maxRequestBodySize: MAX_RUN_REQUEST_BODY_BYTES,
  routes: { '/': web },
  fetch: runtime.application.fetch
})

async function shutdown(): Promise<void> {
  if (closing) return
  closing = true
  await server?.stop()
  await runtime.close()
}

process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)
