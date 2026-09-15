// A scripted run on a timer, so the web application can build every screen,
// failure, cap, and cancel included, before the agent loop exists.
import { assertCompleteLayerTree, type LayerInfo } from '../editor'
import type { RunEvent, RunHandle, RunRequest, RunResult } from './contract'
import { EventLog } from './event-log'

export interface FakeRunOptions {
  /** Milliseconds between steps. */
  intervalMs?: number
  /** Report a recoverable error once this many steps have run, then carry on. */
  recoverableErrorAtStep?: number
  /**
   * End the run with an unrecoverable error once this many steps have run.
   * Never reached if the script or the step cap ends the run first.
   */
  failAtStep?: number
}

// Placeholders that render and open without a server: a grey PNG in the
// viewport's proportions, and a one-pixel PSD with no layers. The layers a
// result lists are the script's story, not this file's contents.
const PNG_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAAEklEQVR42mO4SSJgGNUwNDUAAH0VlvD5ZoSnAAAAAElFTkSuQmCC'
const PSD_URL = 'data:image/vnd.adobe.photoshop;base64,OEJQUwABAAAAAAAAAAMAAAABAAAAAQAIAAMAAAAAAAAAAAAAAAAAANnZ2Q=='

const ORIGINAL: LayerInfo = {
  name: 'Original photograph',
  kind: 'raster',
  visible: true,
  masks: [],
  children: []
}

const SCRIPT: { narration: string; layer?: LayerInfo }[] = [
  { narration: 'Selecting the product' },
  {
    narration: 'Masking out the background',
    layer: {
      name: 'Retouching group',
      kind: 'group',
      visible: true,
      masks: [],
      children: [
        {
          name: 'Background isolation',
          kind: 'raster',
          visible: true,
          masks: [{ kind: 'pixel', enabled: true }],
          children: []
        }
      ]
    }
  },
  {
    narration: 'Warming the highlights with a curves layer',
    layer: { name: 'Warm highlights', kind: 'adjustment', visible: true, masks: [], children: [] }
  },
  {
    narration: 'Painting out the reflections',
    layer: { name: 'Reflections removed', kind: 'raster', visible: true, masks: [], children: [] }
  },
  { narration: 'Checking the result against the instruction' }
]

// The TRD's cost model: each step resends one more 1440x900 frame of about
// 1,570 tokens, read from cache at $1 per million, and writes about 750 tokens
// of output at $50 per million.
const FRAME_TOKENS = 1_570
const OUTPUT_TOKENS_PER_STEP = 750
const USD_PER_CACHED_INPUT_TOKEN = 1 / 1_000_000
const USD_PER_OUTPUT_TOKEN = 50 / 1_000_000

export function fakeRun(
  request: RunRequest,
  { intervalMs = 1000, recoverableErrorAtStep, failAtStep }: FakeRunOptions = {}
): RunHandle {
  const log = new EventLog()
  const layers = [ORIGINAL]
  let steps = 0
  let tokensIn = 0
  let tokensOut = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const end = (event: RunEvent) => {
    clearTimeout(timer)
    log.end(event)
  }

  const result = (complete: boolean): RunResult => {
    if (complete) assertCompleteLayerTree(layers)
    return {
      psdUrl: PSD_URL,
      previewUrl: PNG_URL,
      layers: [...layers],
      complete
    }
  }

  const tick = () => {
    const next = SCRIPT[steps]
    if (steps === failAtStep) return end({ type: 'error', reason: 'The editor stopped responding', recoverable: false })
    if (!next) return end({ type: 'done', result: result(true) })
    if (steps >= request.stepCap) return end({ type: 'done', result: result(false) })

    steps += 1
    if (next.layer) layers.push(next.layer)
    tokensIn += FRAME_TOKENS * steps
    tokensOut += OUTPUT_TOKENS_PER_STEP
    const usd = tokensIn * USD_PER_CACHED_INPUT_TOKEN + tokensOut * USD_PER_OUTPUT_TOKEN
    log.emit({ type: 'step', n: steps, cap: request.stepCap, narration: next.narration })
    log.emit({ type: 'frame', pngUrl: PNG_URL })
    log.emit({ type: 'cost', usd, tokensIn, tokensOut })
    if (steps === recoverableErrorAtStep) {
      log.emit({ type: 'error', reason: 'The live view missed a frame', recoverable: true })
    }
    timer = setTimeout(tick, intervalMs)
  }

  log.emit({ type: 'started', runId: crypto.randomUUID(), viewport: { width: 1440, height: 900 } })
  timer = setTimeout(tick, intervalMs)

  return {
    // Each iteration replays the run from its first event, then follows it live.
    events: log,

    async steer(text) {
      if (log.ended) throw new Error('The run has already ended, so the correction was not applied')
      log.emit({ type: 'correction_ack', text })
    },

    async cancel() {
      if (!log.ended) end({ type: 'done', result: result(false) })
    }
  }
}
