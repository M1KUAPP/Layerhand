// One live run of the real agent behind RUN_MODE=agent (#66): liveAgentRun,
// unchanged, with the real Browserbase client and GPT-6 Astra on the
// `computer` tool. Browserbase's browser loads the Photopea host page from a
// deployed Layerhand, as PUBLIC_URL would give it.
//
//   bun --env-file=<path to .env> run docs/evidence/agent-run/live-run.ts <public URL> [image] [--profile three-edit] [--step-cap 40] [--budget 8]
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import type { RunEvent } from '../../../src/agent/contract'
import { liveAgentRun } from '../../../src/server/agent-run'
import { BrowserbaseClient } from '../../../src/server/browserbase-client'
import { agentRunProfile, evaluateAgentRunAcceptance } from './profiles'

// The run ceiling (docs/TRD.md § One ceiling: fifteen minutes).
const CEILING_MS = 15 * 60_000

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    profile: { type: 'string', default: 'three-edit' },
    'step-cap': { type: 'string', default: '40' },
    budget: { type: 'string', default: '8' }
  }
})
const [publicUrl, imageArgument] = positionals
if (!publicUrl) {
  throw new Error('Usage: live-run.ts <public URL> [image] [--profile three-edit] [--step-cap 40] [--budget 8]')
}
const profile = agentRunProfile(values.profile)
const openAiApiKey = process.env.OPENAI_API_KEY
const browserbaseApiKey = process.env.BROWSERBASE_API_KEY
if (!openAiApiKey || !browserbaseApiKey) throw new Error('OPENAI_API_KEY and BROWSERBASE_API_KEY are required')

const imagePath = resolve(
  imageArgument ?? new URL('../photopea-round-trip/results/input.jpg', import.meta.url).pathname
)
const output = resolve(import.meta.dir, 'output', new Date().toISOString().replaceAll(':', '-'))
await mkdir(output, { recursive: true })

const startedAt = performance.now()
const at = () => Math.round(performance.now() - startedAt)
let frames = 0

// The real client, watched: when its session was created, and whether the run released it.
const client = new BrowserbaseClient(browserbaseApiKey)
const browserbase = {
  sessionId: undefined as string | undefined,
  createStartedMs: null as number | null,
  createdMs: null as number | null,
  releasedMs: null as number | null
}
const sessions = {
  async createSession() {
    browserbase.createStartedMs = at()
    const session = await client.createSession()
    browserbase.createdMs = at()
    browserbase.sessionId = session.id
    return session
  },
  async releaseSession(sessionId: string) {
    await client.releaseSession(sessionId)
    browserbase.releasedMs = at()
  }
}

const managed = liveAgentRun(
  {
    image: new Uint8Array(await readFile(imagePath)),
    filename: basename(imagePath),
    instruction: profile.instruction,
    stepCap: Number(values['step-cap']),
    budgetUsd: Number(values.budget),
    apiKey: openAiApiKey
  },
  {
    hostUrl: new URL('/photopea-host', publicUrl).href,
    sessions,
    async publish(bytes, kind) {
      if (kind === 'frame') {
        frames += 1
        if (frames === 1) await writeFile(resolve(output, 'first-frame.png'), bytes)
        await writeFile(resolve(output, 'last-frame.png'), bytes)
        return `frame:${frames}`
      }
      const name = kind === 'psd' ? 'result.psd' : 'preview.png'
      await writeFile(resolve(output, name), bytes)
      return name
    }
  }
)

// A stopped script still releases the browser: cancel ends the run, and the run closes its editor.
const stop = () => void managed.handle.cancel()
process.once('SIGINT', stop)
const ceiling = setTimeout(stop, CEILING_MS)

const events: (RunEvent & { ms: number })[] = []
for await (const event of managed.handle.events) {
  const record = { ms: at(), ...event }
  events.push(record)
  await appendFile(resolve(output, 'events.ndjson'), `${JSON.stringify(record)}\n`)
  if (event.type === 'step') console.error(`${record.ms} ms  step ${event.n}: ${event.narration}`)
  if (event.type === 'error') console.error(`${record.ms} ms  error: ${event.reason}`)
}
clearTimeout(ceiling)
managed.releaseSecrets()

// Browserbase's own record of the session, a few seconds after release.
await Bun.sleep(5_000)
let browserbaseStatus: string | null = null
if (browserbase.sessionId) {
  const response = await fetch(`https://api.browserbase.com/v1/sessions/${encodeURIComponent(browserbase.sessionId)}`, {
    headers: { 'x-bb-api-key': browserbaseApiKey }
  })
  browserbaseStatus = response.ok
    ? (((await response.json()) as { status?: string }).status ?? null)
    : `HTTP ${response.status}`
}

const last = events.at(-1)
const cost = events.findLast((event) => event.type === 'cost')
const outcome = last?.type === 'done' ? (last.result.complete ? 'complete' : 'incomplete') : 'failed'
const steps = events.filter((event) => event.type === 'step').length
const cacheHitRate = managed.metrics().cacheHitRate
const acceptance = evaluateAgentRunAcceptance(profile, {
  outcome,
  steps,
  cacheHitRate,
  browserReleased: browserbase.releasedMs !== null && browserbaseStatus === 'COMPLETED'
})
const summary = {
  label: 'Live run of liveAgentRun: GPT-6 Astra, computer tool, Browserbase, deployed /photopea-host',
  profile: profile.name,
  instruction: profile.instruction,
  image: basename(imagePath),
  publicUrl,
  stepCap: Number(values['step-cap']),
  budgetUsd: Number(values.budget),
  outcome,
  stopReason: managed.metrics().stopReason,
  steps,
  durationMs: last?.ms ?? at(),
  // Measured from the start of the run: the session request, and the first frame of the opened image.
  browserbase: {
    createStartedMs: browserbase.createStartedMs,
    createdMs: browserbase.createdMs,
    releasedMs: browserbase.releasedMs,
    statusAfterRun: browserbaseStatus
  },
  firstFrameMs: events.find((event) => event.type === 'frame')?.ms ?? null,
  firstStepMs: events.find((event) => event.type === 'step')?.ms ?? null,
  frames,
  cost: cost?.type === 'cost' ? { usd: cost.usd, tokensIn: cost.tokensIn, tokensOut: cost.tokensOut } : null,
  cacheHitRate,
  acceptance,
  layers: last?.type === 'done' ? last.result.layers : null,
  errors: events.flatMap((event) => (event.type === 'error' ? [event.reason] : []))
}
await writeFile(resolve(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary, null, 2))
if (acceptance && !acceptance.passed) process.exitCode = 1
