import { createPhotopeaHostHtml } from '../editor/photopea-host'

export interface ApplicationDependencies {
  databaseReady: () => Promise<boolean>
  routes?: { handle(request: Request): Promise<Response | undefined> }
}

export interface Application {
  fetch(request: Request): Promise<Response>
}

const BASE_SECURITY_HEADERS = {
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY'
} as const

const APPLICATION_CSP = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  'frame-src https://www.photopea.com https://*.browserbase.com',
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'"
].join('; ')

const PHOTOPEA_HOST_CSP = [
  "default-src 'none'",
  'frame-src https://www.photopea.com',
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'"
].join('; ')

function secured(response: Response, csp = APPLICATION_CSP): Response {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) headers.set(name, value)
  headers.set('content-security-policy', csp)
  return new Response(response.body, { status: response.status, headers })
}

function json(value: unknown, status = 200): Response {
  return secured(Response.json(value, { status }))
}

export function createApplication(dependencies: ApplicationDependencies): Application {
  return {
    async fetch(request) {
      const url = new URL(request.url)

      if (request.method === 'GET' && url.pathname === '/health') {
        try {
          if (!(await dependencies.databaseReady())) throw new Error('Database is unavailable')
          return json({ status: 'ok', database: 'ready' })
        } catch {
          return json({ status: 'unavailable', database: 'unavailable' }, 503)
        }
      }

      if (request.method === 'GET' && url.pathname === '/photopea-host') {
        return secured(
          new Response(createPhotopeaHostHtml(), {
            headers: { 'content-type': 'text/html; charset=utf-8' }
          }),
          PHOTOPEA_HOST_CSP
        )
      }

      const routed = await dependencies.routes?.handle(request)
      if (routed) return secured(routed)

      return json({ code: 'not_found', message: 'The requested endpoint does not exist.' }, 404)
    }
  }
}
