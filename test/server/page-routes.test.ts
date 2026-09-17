import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
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

/**
 * "/", every file the page loads, and both banners each say that no site may
 * frame them, that their content type is not to be guessed, and that no
 * referrer is to be sent from them (#114).
 */
async function expectEverythingSecured(origin: string): Promise<void> {
  const urls = [
    new URL('/', origin),
    ...(await filesThePageLoads(origin)),
    new URL('/og-image.png', origin),
    new URL('/og-image-dark.png', origin),
    new URL('/favicon.ico', origin)
  ]
  for (const url of urls) {
    const response = await fetch(url)
    await response.arrayBuffer()

    expect({
      path: url.pathname,
      framing: response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")
        ? 'denied'
        : 'allowed',
      xFrameOptions: response.headers.get('x-frame-options'),
      contentTypeOptions: response.headers.get('x-content-type-options'),
      referrerPolicy: response.headers.get('referrer-policy')
    }).toEqual({
      path: url.pathname,
      framing: 'denied',
      xFrameOptions: 'DENY',
      contentTypeOptions: 'nosniff',
      referrerPolicy: 'no-referrer'
    })
  }
}

async function textRoutesThePageLoads(origin: string): Promise<Record<'html' | 'js' | 'css' | 'svg', URL>> {
  const files = await filesThePageLoads(origin)
  const js = files.find((url) => url.pathname.endsWith('.js'))
  const css = files.find((url) => url.pathname.endsWith('.css'))
  const svg = files.find((url) => url.pathname.endsWith('.svg'))
  if (!js || !css || !svg) throw new Error('Expected js, css, and svg files to be loaded by the page')
  return {
    html: new URL('/', origin),
    js,
    css,
    svg
  }
}

async function binaryRoutesThePageLoads(origin: string): Promise<{
  png: URL[]
  jpeg: URL[]
  video: URL[]
  favicon: URL
}> {
  const files = await filesThePageLoads(origin)
  const png = [
    new URL('/og-image.png', origin),
    new URL('/og-image-dark.png', origin),
    ...files.filter((url) => url.pathname.endsWith('.png'))
  ]
  const jpeg = files.filter((url) => url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg'))
  const video = files.filter((url) => url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm'))
  const favicon = new URL('/favicon.ico', origin)
  return { png, jpeg, video, favicon }
}

function expectSecurityHeadersPreserved(response: Response): void {
  expect({
    framing: response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'") ? 'denied' : 'allowed',
    xFrameOptions: response.headers.get('x-frame-options'),
    contentTypeOptions: response.headers.get('x-content-type-options'),
    referrerPolicy: response.headers.get('referrer-policy')
  }).toEqual({
    framing: 'denied',
    xFrameOptions: 'DENY',
    contentTypeOptions: 'nosniff',
    referrerPolicy: 'no-referrer'
  })
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

  test('serves the Claude Code plugin marketplace, with the security headers (#136)', async () => {
    const server = await serve('https://layerhand.test')

    const response = await fetch(new URL('/plugins/marketplace.json', server.url))
    const body = (await response.json()) as {
      name: string
      plugins: { source: { package: string } }[]
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toStartWith('application/json')
    expectSecurityHeadersPreserved(response)
    expect(body.name).toBe('layerhand')
    expect(body.plugins[0]?.source.package).toBe('layerhand-mcp')
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

  test('the page and everything it loads carry the security headers, so no other site can frame it (#114)', async () => {
    const server = await serve('https://layerhand.test')

    await expectEverythingSecured(server.url.origin)
  })

  test('page HTML, JavaScript, CSS, and SVG responses negotiate Brotli when Accept-Encoding allows br (#197)', async () => {
    const server = await serve('https://layerhand.test')
    const textRoutes = await textRoutesThePageLoads(server.url.origin)

    for (const [name, url] of Object.entries(textRoutes)) {
      const uncompressed = await fetch(url, { headers: { 'accept-encoding': 'identity' } })
      const uncompressedText = await uncompressed.text()
      const expectedContentType = uncompressed.headers.get('content-type')

      for (const acceptEncoding of ['br', 'br, gzip', 'gzip, deflate, br']) {
        const response = await fetch(url, { headers: { 'accept-encoding': acceptEncoding } })

        expect({ route: name, acceptEncoding, status: response.status }).toEqual({
          route: name,
          acceptEncoding,
          status: 200
        })
        expect(response.headers.get('content-encoding')).toBe('br')
        expect(response.headers.get('vary')).toBe('Accept-Encoding')
        expect(response.headers.get('content-type')).toBe(expectedContentType)
        expectSecurityHeadersPreserved(response)
        expect(await response.text()).toBe(uncompressedText)
      }
    }
  })

  test('page HTML, JavaScript, CSS, and SVG responses fall back to gzip when only gzip is accepted (#197)', async () => {
    const server = await serve('https://layerhand.test')
    const textRoutes = await textRoutesThePageLoads(server.url.origin)

    for (const [name, url] of Object.entries(textRoutes)) {
      const uncompressed = await fetch(url, { headers: { 'accept-encoding': 'identity' } })
      const uncompressedText = await uncompressed.text()
      const expectedContentType = uncompressed.headers.get('content-type')

      for (const acceptEncoding of ['gzip', 'gzip, deflate']) {
        const response = await fetch(url, { headers: { 'accept-encoding': acceptEncoding } })

        expect({ route: name, acceptEncoding, status: response.status }).toEqual({
          route: name,
          acceptEncoding,
          status: 200
        })
        expect(response.headers.get('content-encoding')).toBe('gzip')
        expect(response.headers.get('vary')).toBe('Accept-Encoding')
        expect(response.headers.get('content-type')).toBe(expectedContentType)
        expectSecurityHeadersPreserved(response)
        expect(await response.text()).toBe(uncompressedText)
      }
    }
  })

  test('compression follows quality values, with Brotli winning a tie (#197)', async () => {
    const server = await serve('https://layerhand.test')

    for (const [acceptEncoding, expected] of [
      ['gzip;q=1, br;q=0.5', 'gzip'],
      ['gzip;q=0.5, br;q=0.5', 'br'],
      ['gzip;q=0.5, identity;q=1', null],
      ['br;q=0.1, identity;q=1', null],
      ['gzip;q=0.5, br;q=0.4, identity;q=0.9', null],
      ['gzip;q=1, identity;q=0.5', 'gzip'],
      ['br;q=1, identity;q=1', 'br'],
      ['gzip;q=1, br;q=0', 'gzip'],
      ['gzip;q=0, br;q=0', null],
      ['deflate', null],
      ['identity', null]
    ] as const) {
      const response = await fetch(server.url, { headers: { 'accept-encoding': acceptEncoding } })

      expect({ acceptEncoding, encoding: response.headers.get('content-encoding') }).toEqual({
        acceptEncoding,
        encoding: expected
      })
      expect(response.headers.get('vary')).toBe('Accept-Encoding')
      expectSecurityHeadersPreserved(response)
    }
  })

  test('ignores encodings with malformed quality values (#197)', async () => {
    const server = await serve('https://layerhand.test')

    for (const [acceptEncoding, expected] of [
      ['br;q=bogus', null],
      ['br;q=1.5', null],
      ['br;q=0.5junk', null],
      ['br;q=0.5=oops', null],
      ['br;q=0;q=1, identity', null],
      ['br;q=, gzip', 'gzip']
    ] as const) {
      const response = await fetch(server.url, { headers: { 'accept-encoding': acceptEncoding } })

      expect({ acceptEncoding, encoding: response.headers.get('content-encoding') }).toEqual({
        acceptEncoding,
        encoding: expected
      })
    }
  })

  test('returns 406 when the client rejects every available representation (#197)', async () => {
    const server = await serve('https://layerhand.test')

    for (const acceptEncoding of ['identity;q=0, br;q=0, gzip;q=0', '*;q=0']) {
      const response = await fetch(server.url, { headers: { 'accept-encoding': acceptEncoding } })

      expect({ acceptEncoding, status: response.status }).toEqual({ acceptEncoding, status: 406 })
      expect(response.headers.get('vary')).toBe('Accept-Encoding')
      expectSecurityHeadersPreserved(response)
    }

    const identity = await fetch(server.url, {
      headers: { 'accept-encoding': '*;q=0, identity;q=1' }
    })
    expect(identity.status).toBe(200)
    expect(identity.headers.get('content-encoding')).toBeNull()
  })

  test('preserves existing Vary values when adding Accept-Encoding (#197)', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'layerhand-vary-'))
    const htmlPath = join(directory, 'index.html')
    const scriptPath = join(directory, 'app.js')
    try {
      await Promise.all([writeFile(htmlPath, '<main id="app"></main>'), writeFile(scriptPath, 'export {}')])
      const routes = await pageRoutes({
        index: htmlPath,
        files: [
          { path: htmlPath, headers: { 'content-type': 'text/html' } },
          { path: scriptPath, headers: { 'content-type': 'text/javascript', vary: 'Origin' } }
        ]
      } as unknown as typeof web)
      const route = routes[scriptPath]
      if (typeof route !== 'function') throw new Error('Expected the script route to negotiate compression')

      const response = await route(
        new Request(new URL(scriptPath, 'https://layerhand.test'), { headers: { 'accept-encoding': 'br' } })
      )

      expect(response.headers.get('vary')).toBe('Origin, Accept-Encoding')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('page HTML, JavaScript, CSS, and SVG responses include Vary: Accept-Encoding (#197)', async () => {
    const server = await serve('https://layerhand.test')
    const textRoutes = await textRoutesThePageLoads(server.url.origin)

    for (const [name, url] of Object.entries(textRoutes)) {
      for (const acceptEncoding of ['br', 'gzip', 'br, gzip']) {
        const response = await fetch(url, { headers: { 'accept-encoding': acceptEncoding } })

        expect({ route: name, acceptEncoding, status: response.status }).toEqual({
          route: name,
          acceptEncoding,
          status: 200
        })
        expect(response.headers.get('vary')).toBe('Accept-Encoding')
      }
    }
  })

  test('does not compress PNG, JPEG, video, and favicon binary responses even when Accept-Encoding allows compression (#197)', async () => {
    const server = await serve('https://layerhand.test')
    const binaryRoutes = await binaryRoutesThePageLoads(server.url.origin)
    const targets = [
      ...binaryRoutes.png.map((url) => ({ type: 'png', url })),
      ...binaryRoutes.jpeg.map((url) => ({ type: 'jpeg', url })),
      ...binaryRoutes.video.map((url) => ({ type: 'video', url })),
      { type: 'favicon', url: binaryRoutes.favicon }
    ]

    expect(binaryRoutes.png.length).toBeGreaterThan(0)
    expect(binaryRoutes.jpeg.length).toBeGreaterThan(0)
    // The landing has loaded no video since the scrub clip went; one it loads again is still checked below.

    for (const { type, url } of targets) {
      const uncompressed = await fetch(url, { headers: { 'accept-encoding': 'identity' } })
      const uncompressedBytes = new Uint8Array(await uncompressed.arrayBuffer())
      const expectedContentType = uncompressed.headers.get('content-type')

      const response = await fetch(url, { headers: { 'accept-encoding': 'br, gzip' } })
      const bytes = new Uint8Array(await response.arrayBuffer())

      expect({ type, path: url.pathname, status: response.status }).toEqual({
        type,
        path: url.pathname,
        status: 200
      })
      expect(response.headers.get('content-encoding')).toBeNull()
      expect(response.headers.get('content-type')).toBe(expectedContentType)
      expectSecurityHeadersPreserved(response)
      expect(bytes.byteLength).toBe(uncompressedBytes.byteLength)
      expect(bytes).toEqual(uncompressedBytes)
    }
  })

  test('LAYERHAND_PAGE_RELOAD serves the reloading route, and its absence the secured one (#114)', async () => {
    const previous = process.env.LAYERHAND_PAGE_RELOAD
    process.env.LAYERHAND_PAGE_RELOAD = '1'
    try {
      const server = await serve()

      const response = await fetch(server.url)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-frame-options')).toBeNull()
      expect(response.headers.get('content-security-policy')).toBeNull()
    } finally {
      if (previous === undefined) delete process.env.LAYERHAND_PAGE_RELOAD
      else process.env.LAYERHAND_PAGE_RELOAD = previous
    }
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

  test('the built page and its text bundles negotiate Brotli (#197)', async () => {
    const textRoutes = await textRoutesThePageLoads(origin)

    for (const [name, url] of Object.entries(textRoutes)) {
      const response = await fetch(url, { headers: { 'accept-encoding': 'br, gzip' } })

      expect({ route: name, status: response.status, encoding: response.headers.get('content-encoding') }).toEqual({
        route: name,
        status: 200,
        encoding: 'br'
      })
      expect(response.headers.get('vary')).toBe('Accept-Encoding')
      expectSecurityHeadersPreserved(response)
      expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0)
    }
  })

  test('the built page and everything it loads carry the security headers (#114)', async () => {
    await expectEverythingSecured(origin)
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
