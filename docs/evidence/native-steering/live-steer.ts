// One live run with native steering (#9, spike A3): the real agent, GPT-6
// Astra on the `computer` tool over a Responses API WebSocket, driving
// Photopea in a Browserbase browser that loads the host page from a deployed
// Layerhand. A correction is sent while a response is being generated, and
// everything steering did is recorded.
//
// It composes the same pieces as liveAgentRun, holding the model itself so
// that the run can report what the ledger settled.
//
//   bun --env-file=<path to .env> run live-steer.ts <public URL> [image] [--steer-after 3]
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import type { RunEvent } from '../../../src/agent/contract'
import { ResponsesModel } from '../../../src/agent/responses-model'
import type { SteeringEvent } from '../../../src/agent/responses-socket'
import { managedAgentRun } from '../../../src/server/agent-run'
import { BrowserbaseClient } from '../../../src/server/browserbase-client'
import { browserbaseEditorSession } from '../../../src/server/browserbase-editor-session'

// The three-edit instruction spike A0 measured.
const INSTRUCTION = [
  'Make three edits to this photograph, each on its own layer with a name that says what it does:',
  '1. Brighten it with a Levels, Curves, or Brightness/Contrast adjustment layer.',
  '2. Warm its colours with a Photo Filter or Color Balance adjustment layer.',
  '3. Darken the corners into a soft vignette on a new layer.'
].join('\n')

// Sent mid-response. It changes what is still to come without undoing anything.
const CORRECTION = 'Keep the vignette very subtle, and leave the middle of the photograph untouched.'

// The run ceiling (docs/TRD.md § One ceiling: fifteen minutes).
const CEILING_MS = 15 * 60_000

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    'step-cap': { type: 'string', default: '40' },
    budget: { type: 'string', default: '8' },
    'steer-after': { type: 'string', default: '3' }
  }
})
const [publicUrl, imageArgument] = positionals
if (!publicUrl) throw new Error('Usage: live-steer.ts <public URL> [image] [--steer-after 3]')
const openAiApiKey = process.env.OPENAI_API_KEY
const browserbaseApiKey = process.env.BROWSERBASE_API_KEY
if (!openAiApiKey || !browserbaseApiKey) throw new Error('OPENAI_API_KEY and BROWSERBASE_API_KEY are required')

const steerAfterStep = Number(values['steer-after'])
const imagePath = resolve(
  imageArgument ?? new URL('../photopea-round-trip/results/input.jpg', import.meta.url).pathname
)
const output = resolve(import.meta.dir, 'results', new Date().toISOString().replaceAll(':', '-'))
await mkdir(output, { recursive: true })

const startedAt = performance.now()
const at = () => Math.round(performance.now() - startedAt)
let frames = 0

const client = new BrowserbaseClient(browserbaseApiKey)
const browserbase = { sessionId: undefined as string | undefined, createdMs: null as number | null }
const sessions = {
  async createSession() {
    const session = await client.createSession()
    browserbase.createdMs = at()
    browserbase.sessionId = session.id
    // The live view is for the #22 check, and is written to a file rather than
    // printed: the URL carries a token for this session.
    void client
      .getLiveView(session.id)
      .then(({ liveViewUrl }) => writeFile(resolve(output, 'live-view.txt'), `${liveViewUrl}\n`))
      .catch(() => undefined)
    return session
  },
  releaseSession: (sessionId: string) => client.releaseSession(sessionId)
}

const steering: (SteeringEvent & { ms: number })[] = []
const model = new ResponsesModel({
  apiKey: openAiApiKey,
  instruction: INSTRUCTION,
  stepCap: Number(values['step-cap']),
  mechanism: 'computer',
  transport: 'websocket',
  onSteeringEvent(event) {
    const record = { ms: at(), ...event }
    steering.push(record)
    void appendFile(resolve(output, 'steering.ndjson'), `${JSON.stringify(record)}\n`)
    console.error(`${record.ms} ms  ${record.type}${record.reason ? ` (${record.reason})` : ''}`)
  }
})

const session = browserbaseEditorSession({
  id: crypto.randomUUID(),
  hostUrl: new URL('/photopea-host', publicUrl).href,
  sessions
})
const managed = managedAgentRun(
  {
    image: new Uint8Array(await readFile(imagePath)),
    filename: basename(imagePath),
    instruction: INSTRUCTION,
    stepCap: Number(values['step-cap']),
    budgetUsd: Number(values.budget),
    apiKey: openAiApiKey
  },
  {
    session,
    model,
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
  },
  { abandon: () => session.abandon() }
)

// A stopped script still releases the browser: cancel ends the run, and the run closes its editor.
const stop = () => void managed.handle.cancel()
process.once('SIGINT', stop)
const ceiling = setTimeout(stop, CEILING_MS)

const correction = {
  step: steerAfterStep,
  sentMs: null as number | null,
  steerableWhenSent: null as boolean | null,
  error: null as string | null
}
let steered = false

/** Waits for a response to be in flight, then sends the correction into it. */
async function steerNow(): Promise<void> {
  for (let tries = 0; tries < 600 && !model.steerable; tries += 1) await Bun.sleep(50)
  correction.steerableWhenSent = model.steerable
  correction.sentMs = at()
  try {
    await managed.handle.steer(CORRECTION)
    console.error(`${at()} ms  correction sent (steerable: ${correction.steerableWhenSent})`)
  } catch (error) {
    correction.error = error instanceof Error ? error.message : String(error)
  }
}

const events: (RunEvent & { ms: number })[] = []
const narrations: { n: number; ms: number; narration: string }[] = []
for await (const event of managed.handle.events) {
  const record = { ms: at(), ...event }
  events.push(record)
  await appendFile(resolve(output, 'events.ndjson'), `${JSON.stringify(record)}\n`)
  if (event.type === 'step') {
    narrations.push({ n: event.n, ms: record.ms, narration: event.narration })
    console.error(`${record.ms} ms  step ${event.n}: ${event.narration}`)
    if (!steered && event.n >= steerAfterStep) {
      steered = true
      void steerNow()
    }
  }
  if (event.type === 'error') console.error(`${record.ms} ms  error: ${event.reason}`)
}
clearTimeout(ceiling)
managed.releaseSecrets()

const last = events.at(-1)
const cost = events.findLast((event) => event.type === 'cost')
const stepsBeforeCorrection = narrations.filter(({ ms }) => correction.sentMs !== null && ms < correction.sentMs)
const stepsAfterCorrection = narrations.filter(({ ms }) => correction.sentMs !== null && ms >= correction.sentMs)
const summary = {
  label:
    'Live run with native steering: GPT-6 Astra over a Responses API WebSocket, Browserbase, deployed /photopea-host',
  image: basename(imagePath),
  publicUrl,
  outcome: last?.type === 'done' ? (last.result.complete ? 'complete' : 'incomplete') : 'failed',
  stopReason: managed.metrics().stopReason,
  steps: narrations.length,
  durationMs: last?.ms ?? at(),
  cost: cost?.type === 'cost' ? { usd: cost.usd, tokensIn: cost.tokensIn, tokensOut: cost.tokensOut } : null,
  cacheHitRate: managed.metrics().cacheHitRate,
  correction: { text: CORRECTION, ...correction },
  // What the ledger settled: applied means native steering delivered it.
  steering: model.steering,
  steeringEvents: steering,
  acknowledgedMs: events.find((event) => event.type === 'correction_ack')?.ms ?? null,
  stepsBeforeCorrection,
  stepsAfterCorrection,
  layers: last?.type === 'done' ? last.result.layers : null,
  errors: events.flatMap((event) => (event.type === 'error' ? [event.reason] : [])),
  // FR-10's live view is these frames, and #22: no provider address reaches the page.
  frames,
  providerAddressInEvents: JSON.stringify(events).includes('browserbase'),
  browserbaseSessionCreatedMs: browserbase.createdMs
}
await writeFile(resolve(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify({ ...summary, steeringEvents: steering.length }, null, 2))
