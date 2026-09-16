// Serves only the page, as src/server/index.ts does. page-routes.test.ts
// builds this ahead of time, as `bun run build` builds the server, and runs it
// from the output directory, as production does. It prints its origin.
import web from '../../../src/web/index.html'
import { pageRoutes } from '../../../src/server/page-routes'

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  routes: await pageRoutes(web),
  fetch: () => new Response('Not found', { status: 404 })
})
console.log(server.url.origin)
