// The Codex proxy run: Codex on GPT-6 Astra attempts the spike's three-edit
// instruction by sending JavaScript to helper.ts, and this script watches its
// usage and stops it at the credit cap. A feasibility hint for A1 and the
// day-2 gate, not spike A0 data: Codex's own agent and prompt drive, not
// ResponsesModel.
//
//   bun run run.ts [image] [--cap 150] [--minutes 20] [--effort low]
import { appendFileSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const INSTRUCTION = [
  'Make three edits to this photograph, each on its own layer with a name that says what it does:',
  '1. Brighten it with a Levels, Curves, or Brightness/Contrast adjustment layer.',
  '2. Warm its colours with a Photo Filter or Color Balance adjustment layer.',
  '3. Darken the corners into a soft vignette on a new layer.'
].join('\n')

// The same rules the spike's scoring uses (harness.ts).
const SCRIPTING_PATTERN = /postMessage|__layerhand|echoToOE|saveToOE|app\./

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    cap: { type: 'string', default: '150' },
    minutes: { type: 'string', default: '20' },
    effort: { type: 'string', default: 'low' },
    port: { type: 'string', default: '4173' }
  }
})
const image = resolve(positionals[0] ?? new URL('../../photopea-round-trip/output/input.jpg', import.meta.url).pathname)
const capCredits = Number(values.cap)
const port = Number(values.port)
const output = resolve(import.meta.dir, 'output', `${new Date().toISOString().replaceAll(':', '-')}-${basename(image)}`)
await mkdir(output, { recursive: true })
const events = resolve(output, 'codex-events.ndjson')

const prompt = `You are retouching a photograph in Photopea, a web image editor running in a 1440x900 headless browser. The image is already open. Nobody is watching: carry the task through to completion without asking questions.

The task:
${INSTRUCTION}

How to operate the editor. The only way to touch it is this local HTTP API:
- POST http://127.0.0.1:${port}/run with a JavaScript body. It runs as the body of an async function with \`page\`, the Playwright Page, in scope; await is allowed and console.log(value) returns text. The JSON reply has logs, error, and screenshot: the path of a PNG of the editor after your code ran.
  Example: curl -s -X POST --data-binary @step.js http://127.0.0.1:${port}/run
- GET http://127.0.0.1:${port}/screenshot saves a fresh PNG and returns its path.
After every step, look at the screenshot with your image viewing tool before deciding the next step.

Rules:
- Operate the editor through page.mouse and page.keyboard only, as a person using its interface would.
- Do not use page.evaluate, postMessage, Photopea's scripting interface, or its script dialog. Do not type scripts into the editor.
- Put each edit on its own layer and name each layer in plain words.
- Do not export or save the file; that happens after you finish.
- When the three edits are done, reply with a one-sentence summary.`

await writeFile(resolve(output, 'prompt.txt'), prompt)

const helper = Bun.spawn(['bun', 'run', resolve(import.meta.dir, 'helper.ts'), image, output, String(port)], {
  stdout: 'pipe',
  stderr: 'inherit'
})
const ready = await (async () => {
  const reader = helper.stdout.getReader()
  let text = ''
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const { value, done } = await reader.read()
    if (done) return false
    text += new TextDecoder().decode(value)
    if (text.includes('ready ')) return true
  }
  return false
})()
if (!ready) {
  helper.kill()
  throw new Error('The editor helper did not start')
}

interface Usage {
  balance: number | null
  primaryPercent: number | null
  weeklyPercent: number | null
  input: number
  cached: number
  output: number
}

// Codex's published Astra rates, credits per million tokens. The balance only
// falls once the plan's included usage is gone, so the cap also watches this.
const estimateCredits = ({ input, cached, output }: Usage) =>
  ((input - cached) * 250 + cached * 25 + output * 1250) / 1_000_000

// Finds the usage snapshot Codex logs with each turn, wherever it sits in the event.
function usageFrom(value: unknown): Partial<Usage> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const object = value as Record<string, any>
  if (object.rate_limits || object.total_token_usage || object.info?.total_token_usage) {
    const limits = object.rate_limits
    const total = object.info?.total_token_usage ?? object.total_token_usage
    return {
      balance: limits?.credits?.balance !== undefined ? Number(limits.credits.balance) : undefined,
      primaryPercent: limits?.primary?.used_percent,
      weeklyPercent: limits?.secondary?.used_percent,
      input: total?.input_tokens,
      cached: total?.cached_input_tokens,
      output: total?.output_tokens
    } as Partial<Usage>
  }
  for (const child of Object.values(object)) {
    const found = usageFrom(child)
    if (found) return found
  }
  return undefined
}

const usage: Usage = { balance: null, primaryPercent: null, weeklyPercent: null, input: 0, cached: 0, output: 0 }
let startBalance: number | null = null
let stopReason = 'finished'
const startedAt = performance.now()

const codex = Bun.spawn(
  [
    'codex',
    'exec',
    '--json',
    '--skip-git-repo-check',
    '-m',
    'gpt-6-astra',
    '-c',
    `model_reasoning_effort="${values.effort}"`,
    '-s',
    'workspace-write',
    '-c',
    'sandbox_workspace_write.network_access=true',
    '-C',
    output,
    '-o',
    resolve(output, 'last-message.txt'),
    prompt
  ],
  // Written straight to a file, so a chatty stderr can never fill a pipe and stall Codex.
  { stdout: 'pipe', stderr: Bun.file(resolve(output, 'codex-stderr.txt')) }
)
const timer = setTimeout(
  () => {
    stopReason = 'time limit'
    codex.kill()
  },
  Number(values.minutes) * 60_000
)

// `codex exec --json` does not carry usage, but the session log Codex writes
// under ~/.codex/sessions does, with every turn. The newest log started after
// this run began is this run's.
const startedAtMs = Date.now()
let sessionLog: string | undefined

async function findSessionLog(): Promise<string | undefined> {
  const now = new Date()
  const day = resolve(
    homedir(),
    '.codex/sessions',
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  )
  const names = await readdir(day).catch(() => [] as string[])
  let newest: { path: string; birth: number } | undefined
  for (const name of names.filter((n) => n.endsWith('.jsonl'))) {
    const path = resolve(day, name)
    const birth = (await stat(path)).birthtimeMs || (await stat(path)).ctimeMs
    if (birth >= startedAtMs - 5_000 && (!newest || birth > newest.birth)) newest = { path, birth }
  }
  return newest?.path
}

async function pollUsage(): Promise<void> {
  sessionLog ??= await findSessionLog()
  if (!sessionLog) return
  const lines = (await readFile(sessionLog, 'utf8')).split('\n')
  for (const line of lines) {
    if (!line.includes('"token_count"')) continue
    let seen: Partial<Usage> | undefined
    try {
      seen = usageFrom(JSON.parse(line))
    } catch {
      continue
    }
    for (const [key, value] of Object.entries(seen ?? {})) {
      if (value !== undefined && value !== null) (usage as any)[key] = value
    }
    if (usage.balance !== null && startBalance === null) startBalance = usage.balance
  }
  const spent = startBalance !== null && usage.balance !== null ? startBalance - usage.balance : 0
  const estimated = estimateCredits(usage)
  console.error(
    `usage: ${spent.toFixed(1)} credits off the balance, ~${estimated.toFixed(1)} at list rates, 5h ${usage.primaryPercent}%, weekly ${usage.weeklyPercent}%, tokens in ${usage.input} (cached ${usage.cached}) out ${usage.output}`
  )
  if (Math.max(spent, estimated) > capCredits && stopReason === 'finished') {
    stopReason = `credit cap: ${Math.max(spent, estimated).toFixed(1)} > ${capCredits}`
    codex.kill()
  }
}
const poller = setInterval(() => void pollUsage(), 3_000)

const decoder = new TextDecoder()
let buffer = ''
for await (const chunk of codex.stdout) {
  buffer += decoder.decode(chunk)
  let newline: number
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim()
    buffer = buffer.slice(newline + 1)
    if (!line) continue
    appendFileSync(events, `${line}\n`)
    let event: unknown
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    void event
  }
}
await codex.exited
clearTimeout(timer)
clearInterval(poller)
await pollUsage()

const exported = (await fetch(`http://127.0.0.1:${port}/export`, { method: 'POST' }).then((response) =>
  response.json()
)) as { layers: { name: string; kind: string }[]; runs: number }
helper.kill()

const codeLines = (
  await Bun.file(resolve(output, 'code.ndjson'))
    .text()
    .catch(() => '')
)
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line) as { code?: string })
const scripted = codeLines.some((entry) => entry.code && SCRIPTING_PATTERN.test(entry.code))
const adjustmentLayers = exported.layers.filter((layer) => layer.kind === 'adjustment').length
const threeEditsVisible = adjustmentLayers >= 2 && exported.layers.length >= 4
const summary = {
  label: 'Feasibility hint from Codex on GPT-6 Astra. Not spike A0 data.',
  image: basename(image),
  effort: values.effort,
  stopReason,
  codexExitCode: codex.exitCode,
  minutes: Number(((performance.now() - startedAt) / 60_000).toFixed(1)),
  runCalls: exported.runs,
  creditsSpent:
    startBalance !== null && usage.balance !== null ? Number((startBalance - usage.balance).toFixed(2)) : null,
  sessionLog: sessionLog ?? null,
  estimatedCreditsAtListRates: Number(estimateCredits(usage).toFixed(2)),
  startBalance,
  endBalance: usage.balance,
  fiveHourPercent: usage.primaryPercent,
  weeklyPercent: usage.weeklyPercent,
  tokens: { input: usage.input, cached: usage.cached, output: usage.output },
  layers: exported.layers,
  adjustmentLayers,
  threeEditsVisible,
  disqualified: scripted,
  completed: stopReason === 'finished' && codex.exitCode === 0 && threeEditsVisible && !scripted
}
await writeFile(resolve(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary, null, 2))
