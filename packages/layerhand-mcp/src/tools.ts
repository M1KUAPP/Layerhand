import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { ApiError, LayerhandClient } from './client'
import type { RunSnapshot, RunStatus } from './client'
import { VERSION } from './version'

const POLL_MS = 2_000
const DEFAULT_WAIT_SECONDS = 45
const INVALID_HANDLE = 'That is not a run handle. Pass the handle start_run returned.'
const NO_API_KEY = 'OPENAI_API_KEY is not set. Runs from an agent need your own OpenAI API key.'
const STILL_RUNNING = 'The run is still going. Call wait_run first.'

const DONE: readonly RunStatus[] = ['complete', 'incomplete', 'cancelled', 'failed']

/** One text content item holding a JSON object, or an error message; MCP-free on purpose. */
export type ToolResult = {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

export interface ToolsConfig {
  apiKey?: string
  baseUrl: string
  outputDir: string
  fetch?: typeof fetch
  /** Injectable so wait_run's tests do not wait in real time. */
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

export interface StartRunInput {
  image_path: string
  instruction: string
}

export interface WaitRunInput {
  handle: string
  wait_seconds?: number
}

export interface SteerRunInput {
  handle: string
  text: string
}

export interface CancelRunInput {
  handle: string
}

export interface GetResultInput {
  handle: string
  output_dir?: string
}

export function createTools(config: ToolsConfig) {
  const client = new LayerhandClient({ baseUrl: config.baseUrl, version: VERSION, fetch: config.fetch })
  const now = config.now ?? (() => Date.now())
  const sleep = config.sleep ?? ((ms: number) => new Promise<void>((wake) => setTimeout(wake, ms)))
  const outputDir = resolve(config.outputDir)

  async function start_run(input: StartRunInput): Promise<ToolResult> {
    if (!config.apiKey) return fail(NO_API_KEY)
    let image: Uint8Array
    try {
      image = new Uint8Array(await readFile(resolve(input.image_path)))
    } catch {
      return fail(`Could not read the image at ${input.image_path}.`)
    }
    try {
      const { runId, runToken } = await client.startRun({
        image,
        filename: basename(input.image_path),
        instruction: input.instruction,
        apiKey: config.apiKey
      })
      return ok({
        handle: `${runId}.${runToken}`,
        run_id: runId,
        watch_url: new URL(`/?watch=${encodeURIComponent(runId)}`, config.baseUrl).toString(),
        next: 'Call wait_run with the handle to follow the run.'
      })
    } catch (error) {
      return failure(error)
    }
  }

  async function wait_run(input: WaitRunInput): Promise<ToolResult> {
    const handle = parseHandle(input.handle)
    if (!handle) return fail(INVALID_HANDLE)
    const deadline = now() + (input.wait_seconds ?? DEFAULT_WAIT_SECONDS) * 1000
    try {
      for (;;) {
        const snapshot = await client.getRun(handle.runId)
        if (isDone(snapshot.status) || now() >= deadline) return ok(await progress(snapshot))
        await sleep(POLL_MS)
      }
    } catch (error) {
      return failure(error)
    }
  }

  async function steer_run(input: SteerRunInput): Promise<ToolResult> {
    const handle = parseHandle(input.handle)
    if (!handle) return fail(INVALID_HANDLE)
    try {
      await client.steer(handle.runId, handle.runToken, input.text)
      return ok({ accepted: true })
    } catch (error) {
      return failure(error)
    }
  }

  async function cancel_run(input: CancelRunInput): Promise<ToolResult> {
    const handle = parseHandle(input.handle)
    if (!handle) return fail(INVALID_HANDLE)
    try {
      await client.cancel(handle.runId, handle.runToken)
      return ok({
        accepted: true,
        next: 'Call wait_run to follow the run to the end, then get_result: a cancelled run still exports.'
      })
    } catch (error) {
      return failure(error)
    }
  }

  async function get_result(input: GetResultInput): Promise<ToolResult> {
    const handle = parseHandle(input.handle)
    if (!handle) return fail(INVALID_HANDLE)
    try {
      const snapshot = await client.getRun(handle.runId)
      if (!isDone(snapshot.status)) return fail(STILL_RUNNING)
      const result = snapshot.result
      if (!result) return ok({ status: snapshot.status, failure_reason: snapshot.failureReason ?? null })
      const dir = join(resolve(input.output_dir ?? outputDir), snapshot.runId)
      await mkdir(dir, { recursive: true })
      const [psd, preview] = await Promise.all([client.download(result.psdUrl), client.download(result.previewUrl)])
      const psdPath = join(dir, 'layerhand.psd')
      const previewPath = join(dir, 'preview.png')
      await Promise.all([writeFile(psdPath, psd), writeFile(previewPath, preview)])
      return ok({
        psd_path: psdPath,
        preview_path: previewPath,
        complete: result.complete,
        stop_reason: result.stopReason ?? snapshot.stopReason ?? null,
        layers: result.layers
      })
    } catch (error) {
      return failure(error)
    }
  }

  async function progress(snapshot: RunSnapshot) {
    return {
      status: snapshot.status,
      done: isDone(snapshot.status),
      steps: snapshot.steps,
      cap: snapshot.cap,
      narration: snapshot.narration,
      queue_position: snapshot.queuePosition ?? null,
      cost_usd: snapshot.costUsd,
      corrections: snapshot.corrections,
      recoverable_errors: snapshot.recoverableErrors,
      frame_path: await writeFrame(snapshot),
      stop_reason: snapshot.stopReason ?? null,
      failure_reason: snapshot.failureReason ?? null
    }
  }

  /** A `data:` frame is written next to the run's files; its bytes never enter the result. */
  async function writeFrame(snapshot: RunSnapshot): Promise<string | null> {
    const frame = snapshot.frameUrl ? parseDataUrl(snapshot.frameUrl) : undefined
    if (!frame) return null
    const dir = join(outputDir, snapshot.runId)
    await mkdir(dir, { recursive: true })
    const path = join(dir, `latest-frame.${frame.extension}`)
    await writeFile(path, frame.bytes)
    return path
  }

  return { start_run, wait_run, steer_run, cancel_run, get_result }
}

function isDone(status: RunStatus): boolean {
  return DONE.includes(status)
}

function ok(result: Record<string, unknown>): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(result) }] }
}

function fail(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true }
}

/** An API refusal keeps its `{ code, message }` shape as `code: message`. */
function failure(error: unknown): ToolResult {
  if (error instanceof ApiError) return fail(`${error.code}: ${error.message}`)
  return fail(error instanceof Error ? error.message : String(error))
}

/** A handle is `<runId>.<runToken>`; neither part contains a period, so it splits at the last one. */
function parseHandle(handle: string): { runId: string; runToken: string } | undefined {
  const index = handle.lastIndexOf('.')
  if (index <= 0 || index === handle.length - 1) return undefined
  return { runId: handle.slice(0, index), runToken: handle.slice(index + 1) }
}

function parseDataUrl(url: string): { bytes: Uint8Array; extension: string } | undefined {
  const match = /^data:image\/([a-z0-9+-]+);base64,([\s\S]*)$/i.exec(url)
  if (!match) return undefined
  const subtype = match[1]!.toLowerCase()
  return { bytes: Buffer.from(match[2]!, 'base64'), extension: subtype === 'jpeg' ? 'jpg' : subtype }
}
