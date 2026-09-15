// The editor side of the Codex proxy run: live Photopea in local Chromium,
// with one image open, driven only through a local HTTP API. Codex never
// touches the browser; it sends JavaScript to /run, which runs through the
// same code runner as the spike harness and returns the logs and a
// screenshot path. A feasibility hint, not spike A0 data.
//
//   bun run helper.ts <image> <output directory> [port]
import { appendFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

import { chromium } from 'playwright-core'

import { createPhotopeaHostHtml } from '../../../src/editor/photopea-host'
import { pageCodeRunner } from '../driving-mechanism/code-runner'
import { PhotopeaPageSession } from '../driving-mechanism/photopea-page-session'

const [imagePath, outputArgument, portArgument] = Bun.argv.slice(2)
if (!imagePath || !outputArgument) throw new Error('Usage: bun run helper.ts <image> <output directory> [port]')
const output = resolve(outputArgument)
const port = Number(portArgument ?? 4173)
const MAX_RUNS = 60

await mkdir(output, { recursive: true })
const host = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(createPhotopeaHostHtml(), { headers: { 'content-type': 'text/html; charset=utf-8' } })
})
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const session = new PhotopeaPageSession(page, `${host.url.href}photopea-host`)
const runner = pageCodeRunner(page)
await session.open(new Uint8Array(await readFile(imagePath)), basename(imagePath))

let runs = 0
let shots = 0
const codeLog = resolve(output, 'code.ndjson')

async function screenshot(): Promise<string> {
  const path = resolve(output, `step-${String(shots++).padStart(3, '0')}.png`)
  await writeFile(path, await session.screenshot())
  return path
}

const api = Bun.serve({
  hostname: '127.0.0.1',
  port,
  idleTimeout: 120,
  async fetch(request) {
    const { pathname } = new URL(request.url)
    if (pathname === '/health') return Response.json({ ok: true, runs })
    if (request.method === 'GET' && pathname === '/screenshot') return Response.json({ screenshot: await screenshot() })
    if (request.method === 'POST' && pathname === '/run') {
      if (runs >= MAX_RUNS)
        return Response.json({ error: `The step limit of ${MAX_RUNS} runs is reached.` }, { status: 429 })
      const code = await request.text()
      const call = ++runs
      appendFileSync(codeLog, `${JSON.stringify({ call, code })}\n`)
      const result = await runner.run(code, new AbortController().signal)
      appendFileSync(codeLog, `${JSON.stringify({ call, ...result })}\n`)
      return Response.json({ ...result, screenshot: await screenshot(), step: call, stepsLeft: MAX_RUNS - call })
    }
    if (request.method === 'POST' && pathname === '/export') {
      const psd = await session.exportPsd()
      await writeFile(resolve(output, 'result.psd'), psd)
      await writeFile(resolve(output, 'result.png'), await session.exportPreview())
      return Response.json({ layers: await session.layers(), runs })
    }
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
})

console.log(`ready http://127.0.0.1:${api.port}`)

async function shutdown(): Promise<void> {
  api.stop(true)
  host.stop(true)
  await browser.close()
  process.exit(0)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)
