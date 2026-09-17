// Spike A0 (#2): the same three-edit instruction, on the same three images,
// driven once with each mechanism through the real agent loop and live
// Photopea. Every run writes the run-log line from #31, plus what the log
// does not carry: wall clock, silent steps, safety checks, and whether the
// exported PSD shows the three edits.
//
//   bun run docs/evidence/driving-mechanism/harness.ts [--mechanism computer|code|both] [--step-cap 40] [--dry-run] [image ...]
//
// --dry-run swaps GPT-6 Astra for the scripted model, to check the harness
// against live Photopea without an API key. It measures nothing.
import { appendFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { chromium } from 'playwright-core'

import type { RunRequest } from '../../../src/agent/contract'
import type { AgentModel } from '../../../src/agent/model'
import {
  ResponsesApiError,
  ResponsesModel,
  type CodeRunner,
  type DrivingMechanism
} from '../../../src/agent/responses-model'
import { ScriptedModel } from '../../../src/agent/scripted-model'
import { isScriptedTyping } from '../../../src/agent/scripting-guard'
import { createPhotopeaEditorSession } from '../../../src/editor/photopea-editor-session'
import { createPhotopeaHostHtml } from '../../../src/editor/photopea-host'
import type { LayerInfo } from '../../../src/editor/session'
import { managedAgentRun } from '../../../src/server/agent-run'
import { RunRegistry } from '../../../src/server/run-registry'
import { createRunLogger, type RunLogLine } from '../../../src/server/run-log'
import { pageCodeRunner } from './code-runner'

export const INSTRUCTION = [
  'Make three edits to this photograph, each on its own layer with a name that says what it does:',
  '1. Brighten it with a Levels, Curves, or Brightness/Contrast adjustment layer.',
  '2. Warm its colours with a Photo Filter or Color Balance adjustment layer.',
  '3. Darken the corners into a soft vignette on a new layer.'
].join('\n')

// Code that mentions any of these reached Photopea's scripting interface
// rather than its GUI, which is not what the spike measures.
const SCRIPTING_PATTERN = /postMessage|__layerhand|echoToOE/

const DEFAULT_IMAGES = [
  '../../../src/web/assets/sample-photo.png',
  '../photopea-round-trip/results/input.jpg',
  '../../../src/editor/fixtures/document-preview.png'
].map((path) => new URL(path, import.meta.url).pathname)

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    mechanism: { type: 'string', default: 'both' },
    'step-cap': { type: 'string', default: '40' },
    'dry-run': { type: 'boolean', default: false }
  }
})

const dryRun = values['dry-run']
const stepCap = Number(values['step-cap'])
const mechanisms: DrivingMechanism[] =
  values.mechanism === 'both' ? ['computer', 'code'] : [values.mechanism as DrivingMechanism]
if (!mechanisms.every((mechanism) => mechanism === 'computer' || mechanism === 'code')) {
  throw new Error('--mechanism must be computer, code, or both')
}
if (!Number.isSafeInteger(stepCap) || stepCap < 1) throw new Error('--step-cap must be a positive integer')

// The code mechanism runs model-written code in this process, so the key leaves the environment first.
const apiKey = process.env.OPENAI_API_KEY
delete process.env.OPENAI_API_KEY
if (!apiKey && !dryRun) {
  console.error('OPENAI_API_KEY is not set, so nothing was measured. --dry-run checks the harness without it.')
  process.exit(2)
}

interface RunRecord extends RunLogLine {
  mechanism: DrivingMechanism
  image: string
  dryRun: boolean
  silentSteps: number
  safetyChecksAcknowledged: number
  modelError: string | null
  layers: { name: string; kind: string }[]
  adjustmentLayers: number
  numberedLayerNames: number
  threeEditsVisible: boolean
  codeCalls: number
  disqualified: boolean
  completed: boolean
}

const outputDirectory = resolve(import.meta.dir, 'output', new Date().toISOString().replaceAll(':', '-'))
await mkdir(outputDirectory, { recursive: true })
const logPath = resolve(outputDirectory, 'runs.ndjson')
const registry = new RunRegistry({
  onTerminal: createRunLogger({ write: (record) => appendFileSync(logPath, record) })
})

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(createPhotopeaHostHtml(), { headers: { 'content-type': 'text/html; charset=utf-8' } })
})
const browser = await chromium.launch({ headless: true, channel: process.env.LAYERHAND_CHROME_CHANNEL })
const records: RunRecord[] = []

try {
  for (const mechanism of mechanisms) {
    for (const [index, imagePath] of (positionals.length > 0 ? positionals : DEFAULT_IMAGES).entries()) {
      records.push(await measure(mechanism, imagePath, index))
    }
  }
} finally {
  await browser.close()
  server.stop(true)
}

const summary = summarize(records)
await writeFile(resolve(outputDirectory, 'records.json'), `${JSON.stringify(records, null, 2)}\n`)
await writeFile(resolve(outputDirectory, 'summary.md'), summary)
console.log(summary)

async function measure(mechanism: DrivingMechanism, imagePath: string, index: number): Promise<RunRecord> {
  const image = basename(imagePath)
  // The index keeps two images that share a file name apart.
  const runId = `${mechanism}-${index + 1}-${image}`
  const runDirectory = resolve(outputDirectory, runId)
  await mkdir(runDirectory, { recursive: true })

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  // The editor stream's production session: base64 export and nested layer trees.
  const session = createPhotopeaEditorSession(page, {
    id: runId,
    hostUrl: `${server.url.href}photopea-host`,
    commandTimeoutMs: 300_000,
    release: () => page.close()
  })
  const request: RunRequest = {
    image: new Uint8Array(await readFile(imagePath)),
    filename: image,
    instruction: INSTRUCTION,
    stepCap,
    budgetUsd: 8
  }
  // Every call's code is kept, so a run can be checked for scripting the editor.
  const codePath = resolve(runDirectory, 'code.ndjson')
  const codes: string[] = []
  const pageRunner = pageCodeRunner(page)
  const codeRunner: CodeRunner = {
    async run(code, signal) {
      const call = codes.push(code)
      appendFileSync(codePath, `${JSON.stringify({ call, code })}\n`)
      const result = await pageRunner.run(code, signal)
      appendFileSync(codePath, `${JSON.stringify({ call, ...result })}\n`)
      return result
    }
  }
  const responses = dryRun
    ? undefined
    : new ResponsesModel({
        apiKey: apiKey!,
        instruction: INSTRUCTION,
        stepCap,
        mechanism,
        codeRunner
      })
  const inner: AgentModel = responses ?? new ScriptedModel({ delayMs: 50 })

  // A step without narration would stop the loop. Filling it in keeps the
  // run going, so the spike measures driving ability and counts the gap.
  let silentSteps = 0
  let typedScripts = 0
  let modelError: string | null = null
  const model: AgentModel = {
    async next(observation, signal) {
      try {
        const turn = await inner.next(observation, signal)
        for (const action of turn.actions) {
          if (isScriptedTyping(action)) {
            typedScripts += 1
            appendFileSync(codePath, `${JSON.stringify({ typed: action.text })}\n`)
          }
        }
        if (!turn.narration.trim() && (!turn.done || turn.actions.length > 0)) {
          silentSteps += 1
          return { ...turn, narration: '(no narration)' }
        }
        return turn
      } catch (error) {
        modelError =
          error instanceof ResponsesApiError ? error.message : error instanceof Error ? error.name : 'unknown'
        throw error
      }
    }
  }

  let frames = 0
  const managedRun = managedAgentRun(request, {
    session,
    model,
    async publish(bytes, kind) {
      const name =
        kind === 'frame' ? `frame-${String(frames++).padStart(3, '0')}.png` : `result.${kind === 'psd' ? 'psd' : 'png'}`
      await writeFile(resolve(runDirectory, name), bytes)
      return `file://${resolve(runDirectory, name)}`
    }
  })

  registry.register({ runId, instruction: INSTRUCTION, managedRun })
  console.error(`${runId}: running`)
  await registry.waitForTerminal(runId)
  const snapshot = (await registry.getSnapshot(runId))!
  const line = (await readFile(logPath, 'utf8'))
    .trim()
    .split('\n')
    .map((record) => JSON.parse(record) as RunLogLine)
    .find((logged) => logged.runId === runId)
  if (!line) throw new Error(`${runId} finished without a run-log line`)

  const flatten = (tree: readonly LayerInfo[]): LayerInfo[] =>
    tree.flatMap((layer) => [layer, ...flatten(layer.children)])
  const layers = flatten(snapshot.result?.layers ?? []).map(({ name, kind }) => ({ name, kind }))
  const adjustmentLayers = layers.filter((layer) => layer.kind === 'adjustment').length
  const threeEditsVisible = adjustmentLayers >= 2 && layers.length >= 4
  const disqualified = codes.some((code) => SCRIPTING_PATTERN.test(code)) || typedScripts > 0
  const record: RunRecord = {
    ...line,
    mechanism,
    image,
    dryRun,
    silentSteps,
    safetyChecksAcknowledged: responses?.safetyChecksAcknowledged ?? 0,
    modelError,
    layers,
    adjustmentLayers,
    numberedLayerNames: layers.filter((layer) => /\s\d+$/.test(layer.name)).length,
    threeEditsVisible,
    codeCalls: codes.length,
    disqualified,
    completed: snapshot.status === 'complete' && threeEditsVisible && !disqualified
  }
  console.error(`${runId}: ${snapshot.status}, ${snapshot.steps} steps, ${Math.round(record.durationMs / 1000)} s`)
  return record
}

function summarize(runs: RunRecord[]): string {
  const rows = (['computer', 'code'] as const).flatMap((mechanism) => {
    const mine = runs.filter((run) => run.mechanism === mechanism)
    if (mine.length === 0) return []
    const mean = (pick: (run: RunRecord) => number) => mine.reduce((sum, run) => sum + pick(run), 0) / mine.length
    const total = (pick: (run: RunRecord) => number) => mine.reduce((sum, run) => sum + pick(run), 0)
    return [
      `| ${mechanism} | ${mine.filter((run) => run.completed).length}/${mine.length} | ${mean((run) => run.steps).toFixed(1)} | ` +
        `${(mean((run) => run.durationMs) / 1000).toFixed(0)} s | ${total((run) => run.tokensIn)} | ` +
        `${total((run) => run.tokensOut)} | $${total((run) => run.costUsd).toFixed(2)} | ${total((run) => run.silentSteps)} | ${mine.filter((run) => run.disqualified).length} |`
    ]
  })
  return [
    `# Spike A0 results${dryRun ? ' (dry run: scripted model, measures nothing)' : ''}`,
    '',
    '| Mechanism | Completed | Mean steps | Mean wall clock | Tokens in | Tokens out | Cost | Silent steps | Disqualified |',
    '| --------- | --------- | ---------- | --------------- | --------- | ---------- | ---- | ------------ | ------------ |',
    ...rows,
    '',
    ...runs.map(
      (run) =>
        `- ${run.runId}: ${run.outcome}, ${run.steps} steps, ${run.adjustmentLayers} adjustment layers of ` +
        `${run.layers.length}${run.modelError ? `, model error ${run.modelError}` : ''}` +
        (run.disqualified ? ', DISQUALIFIED: it scripted Photopea (see code.ndjson)' : '')
    ),
    ''
  ].join('\n')
}
