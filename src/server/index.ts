import web from '../web/index.html'
import { createApplication } from './application'

const application = createApplication({ databaseReady: async () => true })

Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  routes: { '/': web },
  fetch: application.fetch
})
