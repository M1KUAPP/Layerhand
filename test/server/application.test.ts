import { describe, expect, test } from 'bun:test'

import { createApplication } from '../../src/server/application'

function request(path: string): Request {
  return new Request(`https://layerhand.test${path}`)
}

describe('createApplication', () => {
  test('reports process and database readiness without configuration values', async () => {
    const app = createApplication({ databaseReady: async () => true })

    const response = await app.fetch(request('/health'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok', database: 'ready' })
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('content-security-policy')).toContain("img-src 'self' data: blob: https:")
    expect(response.headers.get('content-security-policy')).toContain("style-src 'self' https://use.hugeicons.com")
    expect(response.headers.get('content-security-policy')).toContain("font-src 'self' data: https://use.hugeicons.com")
    expect(response.headers.get('content-security-policy')).toContain("connect-src 'self' blob:")
  })

  test('returns service unavailable when the database readiness check fails', async () => {
    const app = createApplication({
      databaseReady: async () => {
        throw new Error('postgres://user:secret@database.internal/layerhand')
      }
    })

    const response = await app.fetch(request('/health'))
    const text = await response.text()

    expect(response.status).toBe(503)
    expect(JSON.parse(text)).toEqual({ status: 'unavailable', database: 'unavailable' })
    expect(text).not.toContain('database.internal')
  })

  test('serves the Photopea host without reflecting request data', async () => {
    const app = createApplication({ databaseReady: async () => true })

    const response = await app.fetch(request('/photopea-host?secret=do-not-reflect'))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(html).toContain('title="Photopea"')
    expect(html).not.toContain('do-not-reflect')
  })

  test('returns a stable JSON error for unknown API routes', async () => {
    const app = createApplication({ databaseReady: async () => true })

    const response = await app.fetch(request('/api/unknown'))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      code: 'not_found',
      message: 'The requested endpoint does not exist.'
    })
  })
})
