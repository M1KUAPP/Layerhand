import { afterEach, describe, expect, test } from 'bun:test'

import web from '../../src/web/index.html'
import { pageRoutes } from '../../src/server/page-routes'

const servers: ReturnType<typeof Bun.serve>[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.stop(true)))
})

function serve(publicUrl?: string): ReturnType<typeof Bun.serve> {
  let server: ReturnType<typeof Bun.serve> | undefined
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    routes: pageRoutes(web, { publicUrl, selfOrigin: () => server!.url.origin }),
    fetch: () => new Response('Not found', { status: 404 })
  })
  servers.push(server)
  return server
}

async function previewOf(response: Response): Promise<{ html: string; meta: Map<string, string> }> {
  const meta = new Map<string, string>()
  const html = await new HTMLRewriter()
    .on('meta', {
      element(element) {
        const key = element.getAttribute('property') ?? element.getAttribute('name')
        const content = element.getAttribute('content')
        if (key && content !== null) meta.set(key, content)
      }
    })
    .transform(response)
    .text()
  return { html, meta }
}

describe('page routes', () => {
  test('the rendered page carries an absolute og:image from the public address, and still loads the app', async () => {
    const server = serve('https://layerhand.test')

    const response = await fetch(server.url)
    const { html, meta } = await previewOf(response)

    expect(response.status).toBe(200)
    expect(html).toContain('<main id="app"')
    expect(meta.get('og:image')).toBe('https://layerhand.test/og-image.png')
    expect(meta.get('twitter:image')).toBe('https://layerhand.test/og-image.png')
    expect(meta.get('og:url')).toBe('https://layerhand.test/')
  })

  test('without a public address, previews point at the address the page was requested from', async () => {
    const server = serve()

    const { meta } = await previewOf(await fetch(server.url))

    expect(meta.get('og:image')).toBe(`${server.url.origin}/og-image.png`)
  })

  test('serves both banners as PNGs at their stable paths', async () => {
    const server = serve('https://layerhand.test')

    for (const [path, file] of [
      ['/og-image.png', 'og-image.png'],
      ['/og-image-dark.png', 'og-image-dark.png']
    ] as const) {
      const response = await fetch(new URL(path, server.url))
      const bytes = new Uint8Array(await response.arrayBuffer())
      const expected = Bun.file(new URL(`../../src/web/assets/${file}`, import.meta.url))

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toStartWith('image/png')
      expect(bytes.byteLength).toBe(expected.size)
      expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    }
  })

  test('/favicon.ico is a page route, not the API 404', async () => {
    const server = serve()

    const response = await fetch(new URL('/favicon.ico', server.url))

    // Until the icon file lands the route answers a plain 404; afterwards it
    // serves the icon. Either way it never leaks the API's JSON shape.
    expect(response.headers.get('content-type')).not.toContain('application/json')
    expect([200, 404]).toContain(response.status)
  })
})
