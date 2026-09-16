import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import web from '../../src/web/index.html'
import { pageRoutes } from '../../src/server/page-routes'

const servers: ReturnType<typeof Bun.serve>[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.stop(true)))
})

async function serve(publicUrl?: string): Promise<ReturnType<typeof Bun.serve>> {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    routes: await pageRoutes(web, { publicUrl }),
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

/**
 * The page's own files, as a browser finds them: the script and stylesheet
 * the page links, and the images and video the script refers to.
 */
async function filesThePageLoads(origin: string): Promise<URL[]> {
  const page = new URL('/', origin)
  const html = await (await fetch(page)).text()
  const linked = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(
    ([, reference]) => new URL(reference!, page)
  )
  const script = linked.find((url) => url.pathname.endsWith('.js'))
  const source = script ? await (await fetch(script)).text() : ''
  const media = [...source.matchAll(/"((?:\.\/|\/)[\w./-]+\.(?:png|jpe?g|webp|mp4|webm))"/g)].map(
    ([, reference]) => new URL(reference!, page)
  )
  return [...linked, ...media]
}

async function expectPageFilesServed(origin: string): Promise<void> {
  const files = await filesThePageLoads(origin)
  const extensions = files.map((url) => url.pathname.slice(url.pathname.lastIndexOf('.')))

  expect(extensions).toContain('.js')
  expect(extensions).toContain('.css')
  expect(extensions).toContain('.png')
  for (const file of files) {
    const response = await fetch(file)
    expect({ file: file.pathname, status: response.status }).toEqual({ file: file.pathname, status: 200 })
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0)
  }
}

describe('page routes', () => {
  test('the rendered page carries an absolute og:image from the public address, and still loads the app', async () => {
    const server = await serve('https://layerhand.test')

    const response = await fetch(server.url)
    const { html, meta } = await previewOf(response)

    expect(response.status).toBe(200)
    expect(html).toContain('<main id="app"')
    expect(meta.get('og:image')).toBe('https://layerhand.test/og-image.png')
    expect(meta.get('twitter:image')).toBe('https://layerhand.test/og-image.png')
    expect(meta.get('og:url')).toBe('https://layerhand.test/')
  })

  test('without a public address, previews point at the address the page was requested from', async () => {
    const server = await serve()

    const { meta } = await previewOf(await fetch(server.url))

    expect(meta.get('og:image')).toBe(`${server.url.origin}/og-image.png`)
  })

  test('serves both banners as PNGs at their stable paths', async () => {
    const server = await serve('https://layerhand.test')

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

  test('serves the files the page loads', async () => {
    const server = await serve('https://layerhand.test')

    await expectPageFilesServed(server.url.origin)
  })

  test('/favicon.ico is a page route, not the API 404', async () => {
    const server = await serve()

    const response = await fetch(new URL('/favicon.ico', server.url))

    // Until the icon file lands the route answers a plain 404; afterwards it
    // serves the icon. Either way it never leaks the API's JSON shape.
    expect(response.headers.get('content-type')).not.toContain('application/json')
    expect([200, 404]).toContain(response.status)
  })
})

describe('page routes, built ahead of time', () => {
  // Production runs the output of `bun run build` from its own directory.
  // This builds a server that serves only the page, the same way, and runs it
  // there.
  let outdir: string
  let child: { kill(): void; exited: Promise<number> } | undefined
  let origin: string

  beforeAll(async () => {
    outdir = await mkdtemp(join(tmpdir(), 'layerhand-page-build-'))
    await Bun.build({
      entrypoints: [fileURLToPath(new URL('./support/page-server.ts', import.meta.url))],
      target: 'bun',
      outdir
    })
    const server = Bun.spawn([process.execPath, 'page-server.js'], {
      cwd: outdir,
      env: { ...process.env, NODE_ENV: 'production' },
      stdout: 'pipe',
      stderr: 'pipe'
    })
    child = server
    // The server prints its origin once it is listening.
    const reader = server.stdout.getReader()
    let printed = ''
    while (!printed.includes('\n')) {
      const { value, done } = await reader.read()
      if (done) throw new Error(`The built page server did not start: ${await new Response(server.stderr).text()}`)
      printed += new TextDecoder().decode(value)
    }
    reader.releaseLock()
    origin = printed.trim()
  })

  afterAll(async () => {
    child?.kill()
    await child?.exited
    await rm(outdir, { recursive: true, force: true })
  })

  test('serves the page, with its preview tags, and the files it loads', async () => {
    const { html, meta } = await previewOf(await fetch(origin))

    expect(html).toContain('<main id="app"')
    expect(meta.get('og:image')).toBe(`${origin}/og-image.png`)
    await expectPageFilesServed(origin)
  })

  test('serves both banners', async () => {
    for (const path of ['/og-image.png', '/og-image-dark.png']) {
      const response = await fetch(new URL(path, origin))

      expect({ path, status: response.status }).toEqual({ path, status: 200 })
      expect(response.headers.get('content-type')).toStartWith('image/png')
    }
  })

  test('refuses to start away from the files it serves, rather than serve a page without them', async () => {
    const elsewhere = Bun.spawn([process.execPath, join(outdir, 'page-server.js')], {
      cwd: tmpdir(),
      env: { ...process.env, NODE_ENV: 'production' },
      stdout: 'pipe',
      stderr: 'pipe'
    })
    const exitCode = await Promise.race([elsewhere.exited, Bun.sleep(3_000).then(() => 'still running')])
    elsewhere.kill()

    expect(exitCode).not.toBe('still running')
    expect(exitCode).not.toBe(0)
  })
})
