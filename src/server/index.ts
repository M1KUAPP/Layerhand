import web from '../web/index.html'
import { pageRoutes } from './page-routes'
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
  routes: pageRoutes(web, {
    publicUrl: process.env.PUBLIC_URL,
    selfOrigin: () => `http://127.0.0.1:${server?.port}`
  }),
  fetch: runtime.application.fetch
})

async function shutdown(): Promise<void> {
  if (closing) return
  closing = true
  // Stop taking connections, end the runs in flight, which also ends their
  // event streams, then drop any connection still open.
  void server?.stop()
  await runtime.close()
  await server?.stop(true)
}

process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)
