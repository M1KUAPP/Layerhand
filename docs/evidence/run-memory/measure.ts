// Peak resident memory of the server with twenty runs at once (#101, NFR-4).
// It starts the server in scripted mode, the recorded editor and a scripted
// model, so nothing reaches OpenAI or Browserbase. The one change is to the
// recorded editor's screenshots: each is a new frame of the size the TRD
// measured, so the live view sends a frame every second, as a busy editor
// does. Every run is followed over its event stream as the page follows it,
// and each page reloads once halfway through.
//
//   bun run docs/evidence/run-memory/measure.ts [--label after] [--runs 20] [--step-ms 12000] [--frame-bytes 840000]
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    serve: { type: 'boolean', default: false },
    label: { type: 'string', default: 'measurement' },
    runs: { type: 'string', default: '20' },
    'step-ms': { type: 'string', default: '12000' },
    'frame-bytes': { type: 'string', default: '840000' }
  }
})
const runs = Number(values.runs)
const stepMs = Number(values['step-ms'])
const frameBytes = Number(values['frame-bytes'])
const megabytes = (bytes: number) => Math.round(bytes / 1024 / 102.4) / 10

if (values.serve) await serve()
else await measure()

/** The server, in its own process, so the clients' memory is not counted. */
async function serve(): Promise<void> {
  const { FakeEditorSession } = await import('../../../src/editor/fake-editor-session')
  const { MAX_RUN_REQUEST_BODY_BYTES } = await import('../../../src/server/run-routes')
  const { createLaunchRuntime } = await import('../../../src/server/runtime')

  // A new frame at every look, as a moving editor gives, so none is skipped.
  // Its bytes are random, because a PNG is compressed and macOS would
  // otherwise compress a frame of zeros out of resident memory.
  const pattern = new Uint8Array(frameBytes)
  for (let at = 0; at < frameBytes; at += 65_536) crypto.getRandomValues(pattern.subarray(at, at + 65_536))
  const recordedScreenshot = FakeEditorSession.prototype.screenshot
  let looks = 0
  FakeEditorSession.prototype.screenshot = async function () {
    await recordedScreenshot.call(this)
    const frame = Uint8Array.from(pattern)
    new DataView(frame.buffer).setUint32(0, ++looks)
    return frame
  }

  const runtime = await createLaunchRuntime({
    env: { NODE_ENV: 'development', RUN_MODE: 'scripted', FAKE_RUN_INTERVAL_MS: String(stepMs) },
    clientAddress: () => '127.0.0.1',
    // Production stores files in a bucket, so none is kept in this process.
    artifactStore: {
      put: async ({ kind }) => ({ key: `${kind}/${crypto.randomUUID()}` }),
      presign: async (key) => `https://artifacts.layerhand.invalid/${key}`,
      delete: async () => undefined
    },
    writeRunLog: () => undefined,
    writeRunFailure: () => undefined
  })

  // Bun's heapUsed counts strings and typed arrays too. The allocator keeps
  // pages it has freed, so the heap shows what is retained better than
  // resident memory does.
  let peak = { rss: 0, heapBytes: 0 }
  const sample = () => {
    const { rss, heapUsed } = process.memoryUsage()
    peak = { rss: Math.max(peak.rss, rss), heapBytes: Math.max(peak.heapBytes, heapUsed) }
    return { rss, heapBytes: heapUsed }
  }
  setInterval(sample, 50)
  const server = Bun.serve({
    port: 0,
    maxRequestBodySize: MAX_RUN_REQUEST_BODY_BYTES,
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname !== '/memory') return runtime.application.fetch(request)
      if (url.searchParams.has('gc')) Bun.gc(true)
      if (url.searchParams.has('reset')) peak = { rss: 0, heapBytes: 0 }
      const now = sample()
      return Response.json({ ...now, peakRss: peak.rss, peakHeapBytes: peak.heapBytes })
    }
  })
  console.log(server.port)
}

interface Followed {
  ended: boolean
  outcome: string | null
  frames: number
  /** Frames that arrived in the first quarter second, which is the replay. */
  replayedFrames: number
  replayedBytes: number
}

/** Reads a run's event stream as the page does, until the run ends or `forMs` passes. */
async function follow(base: string, runId: string, forMs = Infinity): Promise<Followed> {
  const response = await fetch(`${base}/api/runs/${runId}/events`)
  if (!response.ok || !response.body) throw new Error(`The event stream answered ${response.status}`)
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  const subscribedAt = performance.now()
  const followed: Followed = { ended: false, outcome: null, frames: 0, replayedFrames: 0, replayedBytes: 0 }
  const stop = setTimeout(() => void reader.cancel(), forMs === Infinity ? 2 ** 31 - 1 : forMs)
  let buffered = ''
  let event = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      const replaying = performance.now() - subscribedAt < 250
      if (replaying) followed.replayedBytes += value.length
      const lines = (buffered + value).split('\n')
      buffered = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('event: ')) event = line.slice(7)
        if (!line.startsWith('data: ')) continue
        if (event === 'frame') {
          followed.frames += 1
          if (replaying) followed.replayedFrames += 1
        }
        if (event === 'done') followed.outcome = 'done'
        if (event === 'error' && line.includes('"recoverable":false')) followed.outcome = 'failed'
      }
    }
  } catch {
    // Cancelled for the reload.
  } finally {
    clearTimeout(stop)
  }
  followed.ended = followed.outcome !== null
  return followed
}

async function measure(): Promise<void> {
  const server = Bun.spawn([process.execPath, import.meta.path, '--serve', ...Bun.argv.slice(2)], {
    stdout: 'pipe',
    stderr: 'inherit'
  })
  try {
    const reader = server.stdout.pipeThrough(new TextDecoderStream()).getReader()
    const port = Number((await reader.read()).value?.trim())
    const base = `http://127.0.0.1:${port}`
    const memory = async (query = '') =>
      (await (await fetch(`${base}/memory${query}`)).json()) as {
        rss: number
        heapBytes: number
        peakRss: number
        peakHeapBytes: number
      }

    const image = await Bun.file(new URL('../../../src/web/assets/sample-photo.png', import.meta.url)).bytes()
    const idle = await memory('?gc&reset')
    const runLengthMs = 5 * stepMs

    const followed = await Promise.all(
      Array.from({ length: runs }, async () => {
        const form = new FormData()
        form.set('image', new File([image], 'layerhand-sample.png', { type: 'image/png' }))
        form.set('filename', 'layerhand-sample.png')
        form.set('instruction', 'Warm the highlights and keep the shadow')
        // Each run comes with its own key, as FR-36 allows, so none draws on
        // the free allowance. Scripted mode never calls the model with it.
        form.set('apiKey', 'scripted-mode-uses-no-key')
        const started = await fetch(`${base}/api/runs`, { method: 'POST', body: form })
        if (started.status !== 201) throw new Error(`POST /api/runs answered ${started.status}`)
        const { runId } = (await started.json()) as { runId: string }
        const beforeReload = await follow(base, runId, runLengthMs / 2)
        const afterReload = await follow(base, runId)
        return { beforeReload, afterReload }
      })
    )
    const peak = await memory()
    const retained = await memory('?gc')

    const mean = (numbers: number[]) => Math.round((numbers.reduce((sum, n) => sum + n, 0) / numbers.length) * 10) / 10
    const summary = {
      label: values.label,
      measured: new Date().toISOString(),
      runtime: `Bun ${Bun.version}, ${process.platform} ${process.arch}`,
      runs,
      stepMs,
      frameBytes,
      uploadBytes: image.byteLength,
      idleRssMb: megabytes(idle.rss),
      peakRssMb: megabytes(peak.peakRss),
      idleHeapMb: megabytes(idle.heapBytes),
      peakHeapMb: megabytes(peak.peakHeapBytes),
      // After the runs end, while the registry still holds them, and after a full collection.
      retainedHeapMb: megabytes(retained.heapBytes),
      framesPerRun: mean(followed.map(({ beforeReload, afterReload }) => beforeReload.frames + afterReload.frames)),
      reload: {
        replayedFrames: mean(followed.map(({ afterReload }) => afterReload.replayedFrames)),
        replayedMb: mean(followed.map(({ afterReload }) => megabytes(afterReload.replayedBytes)))
      },
      outcomes: Object.fromEntries(
        [...new Set(followed.map(({ afterReload }) => afterReload.outcome))].map((outcome) => [
          outcome,
          followed.filter(({ afterReload }) => afterReload.outcome === outcome).length
        ])
      )
    }

    const output = resolve(import.meta.dir, 'output', new Date().toISOString().replaceAll(':', '-'))
    await mkdir(output, { recursive: true })
    await writeFile(resolve(output, `${values.label}.json`), `${JSON.stringify(summary, null, 2)}\n`)
    console.log(JSON.stringify(summary, null, 2))
  } finally {
    server.kill()
  }
}
