// Button to first frame, warm against cold (#70, NFR-3). It drives the
// deployed service over its public API exactly as the page does: upload the
// image, wait as a user would while typing the instruction, start the run,
// and time the first frame from the moment the run request was sent.
//
// Each run is cancelled as soon as its first frame arrives, so the
// measurement costs a few model calls rather than a whole retouch.
//
//   bun run measure.ts <base URL> [image] [--type-ms 8000]
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const INSTRUCTION = 'Brighten the photograph with an adjustment layer named for what it does.'

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: { 'type-ms': { type: 'string', default: '8000' } }
})
const [baseUrl, imageArgument] = positionals
if (!baseUrl) throw new Error('Usage: measure.ts <base URL> [image] [--type-ms 8000]')
const typeMs = Number(values['type-ms'])
const imagePath = resolve(
  imageArgument ?? new URL('../photopea-round-trip/results/input.jpg', import.meta.url).pathname
)
const image = new Uint8Array(await readFile(imagePath))
const filename = basename(imagePath)

const url = (path: string) => new URL(path, baseUrl).href
const imageBlob = () => new File([image.slice() as unknown as BlobPart], filename, { type: 'image/jpeg' })

/** The visitor cookie a response set, as the next request sends it back. */
function cookieFrom(response: Response): string | undefined {
  const header = response.headers.get('set-cookie')
  return header ? header.split(';')[0] : undefined
}

async function warmUpload(): Promise<{ uploadId: string | null; cookie: string | undefined }> {
  const body = new FormData()
  body.set('image', imageBlob(), filename)
  body.set('filename', filename)
  const response = await fetch(url('/api/uploads'), { method: 'POST', body })
  if (!response.ok) throw new Error(`POST /api/uploads answered ${response.status}`)
  const { uploadId } = (await response.json()) as { uploadId: string | null }
  return { uploadId, cookie: cookieFrom(response) }
}

interface Measurement {
  warm: boolean
  runId: string
  firstFrameMs: number | null
  firstStepMs: number | null
  costUsd: number | null
}

/** Starts a run and times its first frame, then cancels it. */
async function timeFirstFrame(uploadId: string | null, cookie: string | undefined): Promise<Measurement> {
  const body = new FormData()
  body.set('image', imageBlob(), filename)
  body.set('filename', filename)
  body.set('instruction', INSTRUCTION)
  if (uploadId) body.set('uploadId', uploadId)

  const startedAt = performance.now()
  const response = await fetch(url('/api/runs'), {
    method: 'POST',
    body,
    ...(cookie ? { headers: { cookie } } : {})
  })
  if (!response.ok) throw new Error(`POST /api/runs answered ${response.status}`)
  const { runId } = (await response.json()) as { runId: string }

  const events = await fetch(url(`/api/runs/${encodeURIComponent(runId)}/events`), {
    headers: { accept: 'text/event-stream' }
  })
  if (!events.ok || !events.body) throw new Error(`The event stream answered ${events.status}`)

  const measurement: Measurement = {
    warm: uploadId !== null,
    runId,
    firstFrameMs: null,
    firstStepMs: null,
    costUsd: null
  }
  const reader = events.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffered = ''
  try {
    while (measurement.firstFrameMs === null) {
      const { value, done } = await reader.read()
      if (done) break
      buffered += value
      // A frame's data URL is far larger than one chunk, so the last piece is
      // kept back until its newline arrives rather than parsed half-read.
      const lines = buffered.split('\n')
      buffered = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const event = JSON.parse(line.slice(6)) as { type: string; usd?: number }
        const at = Math.round(performance.now() - startedAt)
        if (event.type === 'step' && measurement.firstStepMs === null) measurement.firstStepMs = at
        if (event.type === 'cost' && typeof event.usd === 'number') measurement.costUsd = event.usd
        if (event.type === 'frame' && measurement.firstFrameMs === null) measurement.firstFrameMs = at
        if (event.type === 'error') console.error(`${at} ms  ${line.slice(6)}`)
      }
      buffered = buffered.slice(buffered.lastIndexOf('\n') + 1)
    }
  } finally {
    await reader.cancel()
    // The run keeps whatever it has made; nothing here needs the file.
    await fetch(url(`/api/runs/${encodeURIComponent(runId)}/cancel`), { method: 'POST' }).catch(() => undefined)
  }
  return measurement
}

const output = resolve(import.meta.dir, 'output', new Date().toISOString().replaceAll(':', '-'))
await mkdir(output, { recursive: true })

console.error('Warming the editor, then waiting as a user would while typing...')
const { uploadId, cookie } = await warmUpload()
if (!uploadId) console.error('This service warms nothing, so both runs will be cold.')
await Bun.sleep(typeMs)
const warm = await timeFirstFrame(uploadId, cookie)
console.error(`warm: first frame ${warm.firstFrameMs} ms`)

// A second visitor, with no warm session, for the comparison.
const cold = await timeFirstFrame(null, undefined)
console.error(`cold: first frame ${cold.firstFrameMs} ms`)

const summary = {
  label: 'Button to first frame on the deployed service, warm against cold (#70)',
  baseUrl,
  image: filename,
  typedForMs: typeMs,
  warm,
  cold,
  savedMs: warm.firstFrameMs !== null && cold.firstFrameMs !== null ? cold.firstFrameMs - warm.firstFrameMs : null
}
await writeFile(resolve(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary, null, 2))
