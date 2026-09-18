import { afterEach, expect, test } from 'bun:test'
import { gunzipSync } from 'node:zlib'

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

async function inspectMcpPage(html: string): Promise<{
  prompt: string
  hasCopy: boolean
  platforms: { platform: string; open: boolean }[]
  nav: { name: string; href: string }[]
}> {
  let prompt = ''
  let hasCopy = false
  const platforms: { platform: string; open: boolean }[] = []
  const nav: { name: string; href: string }[] = []
  await new HTMLRewriter()
    .on('#setup-prompt', {
      text(text) {
        prompt += text.text
      }
    })
    .on('[data-copy-prompt]', {
      element() {
        hasCopy = true
      }
    })
    .on('details[data-platform]', {
      element(element) {
        platforms.push({
          platform: element.getAttribute('data-platform') ?? '',
          open: element.getAttribute('open') !== null
        })
      }
    })
    .on('nav[aria-label="Primary"] a', {
      element(element) {
        nav.push({
          name: '',
          href: element.getAttribute('href') ?? ''
        })
      },
      text(text) {
        const last = nav.at(-1)
        if (last) last.name += text.text
      }
    })
    .transform(new Response(html))
    .text()
  return { prompt, hasCopy, platforms, nav: nav.map((item) => ({ ...item, name: item.name.trim() })) }
}

test('GET /mcp twice returns the setup prompt and collapsed Codex and Claude Code manuals', async () => {
  const server = await serve('https://layerhand.test')
  const url = new URL('/mcp', server.url)

  const bodies: string[] = []
  for (const turn of [1, 2]) {
    const response = await fetch(url)
    expect({ turn, status: response.status }).toEqual({ turn, status: 200 })
    expect(response.headers.get('content-type')).toStartWith('text/html')
    const html = await response.text()
    bodies.push(html)

    const page = await inspectMcpPage(html)
    expect(page.prompt.trim().length).toBeGreaterThan(0)
    expect(page.prompt).toContain('OPENAI_API_KEY')
    expect(page.prompt).toContain('https://layerhand.test/plugins/layerhand-mcp.tgz')
    expect(page.prompt).toContain('https://layerhand.test/plugins/layerhand.zip')
    expect(html).toContain('npx -y https://layerhand.test/plugins/layerhand-mcp.tgz')
    expect(html).toContain('claude plugin marketplace add https://layerhand.test/plugins/marketplace.json')
    expect(page.hasCopy).toBe(true)

    const css = await fetch(new URL('/mcp.css', server.url))
    const script = await fetch(new URL('/mcp.js', server.url))
    expect(css.status).toBe(200)
    expect((await css.text()).length).toBeGreaterThan(0)
    expect(script.status).toBe(200)
    expect(await script.text()).toContain('data-copy-prompt')

    const codex = page.platforms.find((entry) => entry.platform === 'codex')
    const claude = page.platforms.find((entry) => entry.platform === 'claude-code')
    expect(codex).toEqual({ platform: 'codex', open: false })
    expect(claude).toEqual({ platform: 'claude-code', open: false })

    expect(html).toContain('class="site-header"')
    expect(html).toContain('class="input-grid"')
    expect(html).toContain('class="workbench-board"')
    expect(html).toContain('class="workbench-card"')
    expect(page.nav.map((item) => item.name)).toEqual(['How it works', 'MCP', 'Updates', 'Try it free'])
    expect(page.nav.map((item) => item.name)).not.toContain('The layers')
    expect(page.nav.map((item) => item.name)).not.toContain('A real run')
    expect(page.nav.map((item) => item.name)).not.toContain('FAQ')
  }

  expect(bodies[0]).toBe(bodies[1])
}, 60_000)

test('GET the marketplace catalog twice points the plugin at a hosted archive, not unpublished npm', async () => {
  const server = await serve('https://layerhand.test')
  const url = new URL('/plugins/marketplace.json', server.url)

  const bodies: unknown[] = []
  for (const turn of [1, 2]) {
    const response = await fetch(url)
    expect({ turn, status: response.status }).toEqual({ turn, status: 200 })
    expect(response.headers.get('content-type')).toStartWith('application/json')
    const body = (await response.json()) as {
      name: string
      plugins: { source: { source?: string; url?: string; package?: string } }[]
    }
    bodies.push(body)

    expect(body.name).toBe('layerhand')
    const source = body.plugins[0]?.source
    expect(source?.source).toBe('archive')
    expect(source?.url).toBe('https://layerhand.test/plugins/layerhand.zip')
    expect(source?.package).toBeUndefined()
  }

  expect(bodies[0]).toEqual(bodies[1])
}, 60_000)

test('the Codex plugin manifest uses the hosted tarball, not unpublished npm', async () => {
  const manifest = (await Bun.file(new URL('../../packages/layerhand-mcp/mcp.json', import.meta.url)).json()) as {
    mcpServers: { layerhand: { args: string[] } }
  }

  expect(manifest.mcpServers.layerhand.args).toEqual([
    '-y',
    'https://layerhand-732371853772.us-central1.run.app/plugins/layerhand-mcp.tgz'
  ])
})

test('GET the hosted MCP tarball twice is a real npm pack of layerhand-mcp', async () => {
  const server = await serve('https://layerhand.test')
  const url = new URL('/plugins/layerhand-mcp.tgz', server.url)

  const sizes: number[] = []
  for (const turn of [1, 2]) {
    const response = await fetch(url)
    expect({ turn, status: response.status }).toEqual({ turn, status: 200 })
    const type = response.headers.get('content-type') ?? ''
    expect(type.includes('gzip') || type.includes('tar') || type.includes('octet-stream')).toBe(true)
    const bytes = new Uint8Array(await response.arrayBuffer())
    sizes.push(bytes.byteLength)
    expect(bytes.byteLength).toBeGreaterThan(1024)
    expect([...bytes.subarray(0, 2)]).toEqual([0x1f, 0x8b])

    const tar = gunzipSync(bytes)
    const listing = new TextDecoder('latin1').decode(tar)
    expect(listing).toContain('package/package.json')
    expect(listing).toContain('package/dist/layerhand-mcp.js')
    expect(listing).toContain('https://layerhand-732371853772.us-central1.run.app/plugins/layerhand-mcp.tgz')
    expect(listing).not.toContain('"-y", "layerhand-mcp"')
  }

  expect(sizes[0]).toBe(sizes[1])
}, 60_000)

test('GET the hosted Claude plugin zip twice is a real plugin archive with the stdio binary', async () => {
  const server = await serve('https://layerhand.test')
  const url = new URL('/plugins/layerhand.zip', server.url)

  const sizes: number[] = []
  for (const turn of [1, 2]) {
    const response = await fetch(url)
    expect({ turn, status: response.status }).toEqual({ turn, status: 200 })
    expect(response.headers.get('content-type')).toStartWith('application/zip')
    const bytes = new Uint8Array(await response.arrayBuffer())
    sizes.push(bytes.byteLength)
    expect(bytes.byteLength).toBeGreaterThan(1024)
    expect([...bytes.subarray(0, 2)]).toEqual([0x50, 0x4b])

    const listing = new TextDecoder('latin1').decode(bytes)
    expect(listing).toContain('.claude-plugin/plugin.json')
    expect(listing).toContain('dist/layerhand-mcp.js')
  }

  expect(sizes[0]).toBe(sizes[1])
}, 60_000)

test('GET the hosted stdio binary twice is the built layerhand-mcp entry', async () => {
  const server = await serve()
  const url = new URL('/plugins/layerhand-mcp.js', server.url)

  const bodies: string[] = []
  for (const turn of [1, 2]) {
    const response = await fetch(url)
    expect({ turn, status: response.status }).toEqual({ turn, status: 200 })
    expect(response.headers.get('content-type')).toMatch(/javascript|ecmascript/)
    const body = await response.text()
    bodies.push(body)
    expect(body.startsWith('#!/usr/bin/env node')).toBe(true)
    expect(body).toContain('start_run')
    expect(body).toContain('wait_run')
  }

  expect(bodies[0]).toBe(bodies[1])
}, 60_000)
