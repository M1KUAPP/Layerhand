import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium, type Page } from 'playwright-core'
import sharp from 'sharp'

import { photopeaEditorUrl } from './protocol.ts'

const OUTPUT_DIRECTORY = resolve(import.meta.dir, 'output')
const PHOTO_URL = 'https://picsum.photos/seed/layerhand/640/480.jpg'
const PHOTOPEA_URL = photopeaEditorUrl()
const outerHtml = `<!doctype html>
<html>
  <body>
    <iframe id="photopea" src="${PHOTOPEA_URL}"></iframe>
    <script>
      window.__photopeaMessages = [];
      window.addEventListener("message", function (event) {
        if (event.source !== document.getElementById("photopea").contentWindow) return;
        window.__photopeaMessages.push(event.data);
      });
    </script>
  </body>
</html>`

type SerializedMessage = { kind: 'binary'; base64: string; size: number } | { kind: 'string'; value: string }

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(outerHtml, { headers: { 'content-type': 'text/html' } })
})
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const photoResponse = await fetch(PHOTO_URL)
if (!photoResponse.ok) {
  throw new Error(`Photo download failed with HTTP ${photoResponse.status}`)
}
const jpeg = Buffer.from(await photoResponse.arrayBuffer())

async function messageCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          __photopeaMessages: unknown[]
        }
      ).__photopeaMessages.length
  )
}

async function messagesSince(page: Page, startIndex: number): Promise<SerializedMessage[]> {
  return page.evaluate(
    ({ start }) => {
      const messages = (
        window as typeof window & {
          __photopeaMessages: unknown[]
        }
      ).__photopeaMessages.slice(start)

      return messages.map((message): SerializedMessage => {
        if (typeof message === 'string') {
          return { kind: 'string', value: message }
        }

        const bytes = new Uint8Array(message as ArrayBuffer)
        let binary = ''
        for (let offset = 0; offset < bytes.length; offset += 32_768) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768))
        }
        return {
          base64: btoa(binary),
          kind: 'binary',
          size: bytes.length
        }
      })
    },
    { start: startIndex }
  )
}

async function newSession(): Promise<{ page: Page; readyMs: number }> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const startedAt = performance.now()
  await page.goto(server.url.href, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      (
        window as typeof window & {
          __photopeaMessages: unknown[]
        }
      ).__photopeaMessages.some((message) => message === 'done'),
    undefined,
    { timeout: 30_000 }
  )
  return { page, readyMs: performance.now() - startedAt }
}

async function sendBinary(page: Page, bytes: Buffer): Promise<number> {
  const startIndex = await messageCount(page)
  const startedAt = performance.now()
  await page.evaluate(
    ({ base64 }) => {
      const binary = atob(base64)
      const data = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        data[index] = binary.charCodeAt(index)
      }
      const frame = document.getElementById('photopea') as HTMLIFrameElement
      frame.contentWindow?.postMessage(data.buffer, '*', [data.buffer])
    },
    { base64: bytes.toString('base64') }
  )
  await page.waitForFunction(
    ({ start }) =>
      (
        window as typeof window & {
          __photopeaMessages: unknown[]
        }
      ).__photopeaMessages
        .slice(start)
        .some((message) => message === 'done'),
    { start: startIndex },
    { timeout: 30_000 }
  )
  return performance.now() - startedAt
}

async function sendScript(
  page: Page,
  script: string,
  token: string,
  timeoutMs = 3_000
): Promise<{
  completed: boolean
  elapsedMs: number
  messages: SerializedMessage[]
}> {
  const startIndex = await messageCount(page)
  const startedAt = performance.now()
  await page.evaluate(
    ({ scriptText }) => {
      const frame = document.getElementById('photopea') as HTMLIFrameElement
      frame.contentWindow?.postMessage(scriptText, '*')
    },
    { scriptText: script }
  )

  let completed = true
  try {
    await page.waitForFunction(
      ({ start, expected }) =>
        (
          window as typeof window & {
            __photopeaMessages: unknown[]
          }
        ).__photopeaMessages
          .slice(start)
          .some((message) => typeof message === 'string' && message.startsWith(expected)),
      { expected: token, start: startIndex },
      { timeout: timeoutMs }
    )
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Timeout')) {
      throw error
    }
    completed = false
  }

  return {
    completed,
    elapsedMs: performance.now() - startedAt,
    messages: await messagesSince(page, startIndex)
  }
}

function token(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`
}

function strings(messages: SerializedMessage[]): string[] {
  return messages.filter((message) => message.kind === 'string').map((message) => message.value)
}

async function syntaxProbe(name: string, expression: (probeToken: string) => string): Promise<Record<string, unknown>> {
  const { page, readyMs } = await newSession()
  try {
    const probeToken = token(name)
    const result = await sendScript(page, expression(probeToken), probeToken)
    return { name, readyMs: Math.round(readyMs), ...result, messages: strings(result.messages) }
  } finally {
    await page.close()
  }
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true })

try {
  const syntax = [
    await syntaxProbe('arrow', (probeToken) => `var answer = () => 7; app.echoToOE("${probeToken}:" + answer());`),
    await syntaxProbe('template', (probeToken) => `var answer = \`seven\`; app.echoToOE("${probeToken}:" + answer);`),
    await syntaxProbe(
      'for-of',
      (probeToken) => `var total = 0; for (var value of [3, 4]) total += value; app.echoToOE("${probeToken}:" + total);`
    )
  ]

  const crashSession = await newSession()
  const crashUploadMs = await sendBinary(crashSession.page, jpeg)
  const crashStartIndex = await messageCount(crashSession.page)
  await crashSession.page.evaluate(() => {
    const frame = document.getElementById('photopea') as HTMLIFrameElement
    frame.contentWindow?.postMessage('app.activeDocument.thisMethodDoesNotExist();', '*')
  })
  await crashSession.page.waitForTimeout(250)
  const recoveryToken = token('after-crash')
  const recovery = await sendScript(
    crashSession.page,
    `app.activeDocument.activeLayer.name = "After crash"; app.echoToOE("${recoveryToken}:" + app.activeDocument.activeLayer.name);`,
    recoveryToken
  )
  const crashMessages = await messagesSince(crashSession.page, crashStartIndex)
  await crashSession.page.close()

  const selectionSession = await newSession()
  const selectionUploadMs = await sendBinary(selectionSession.page, jpeg)
  const selectionToken = token('selection')
  const selection = await sendScript(
    selectionSession.page,
    [
      'var doc = app.activeDocument;',
      'doc.selection.select([[0,0],[64,0],[64,64],[0,64]]);',
      'var bounds = doc.selection.bounds;',
      `app.echoToOE("${selectionToken}:" + bounds[0].value + "," + bounds[1].value + "," + bounds[2].value + "," + bounds[3].value);`
    ].join('\n'),
    selectionToken
  )
  await selectionSession.page.close()

  const colourSession = await newSession()
  const colourUploadMs = await sendBinary(colourSession.page, jpeg)
  const colourToken = token('colour')
  const colour = await sendScript(
    colourSession.page,
    [
      'var doc = app.activeDocument;',
      'var colour = new SolidColor();',
      'colour.rgb.hexValue = "FF0000";',
      'doc.selection.selectAll();',
      'doc.selection.fill(colour);',
      'doc.saveToOE("png");',
      `app.echoToOE("${colourToken}");`
    ].join('\n'),
    colourToken,
    10_000
  )
  await colourSession.page.close()
  const pngMessage = colour.messages.find((message) => message.kind === 'binary')
  const pixel = pngMessage
    ? await sharp(Buffer.from(pngMessage.base64, 'base64'))
        .raw()
        .toBuffer()
        .then((pixels) => Array.from(pixels.subarray(0, 4)))
    : null

  async function textProbe(delayAfterReadyMs: number): Promise<Record<string, unknown>> {
    const session = await newSession()
    try {
      if (delayAfterReadyMs > 0) {
        await session.page.waitForTimeout(delayAfterReadyMs)
      }
      const textToken = token(`text-${delayAfterReadyMs}`)
      const result = await sendScript(
        session.page,
        [
          'var doc = app.documents.add(64, 64);',
          'var layer = doc.artLayers.add();',
          'layer.kind = LayerKind.TEXT;',
          'layer.textItem.contents = "Layerhand";',
          `app.echoToOE("${textToken}:" + layer.textItem.contents + ":" + doc.layers.length);`
        ].join('\n'),
        textToken
      )
      return {
        delayAfterReadyMs,
        readyMs: Math.round(session.readyMs),
        ...result,
        messages: strings(result.messages)
      }
    } finally {
      await session.page.close()
    }
  }

  const result = {
    colour: {
      ...colour,
      messages: colour.messages.map((message) =>
        message.kind === 'string' ? message.value : `binary:${message.size}`
      ),
      pixel,
      readyMs: Math.round(colourSession.readyMs),
      uploadMs: Math.round(colourUploadMs)
    },
    crash: {
      crashMessages: crashMessages.map((message) =>
        message.kind === 'string' ? message.value : `binary:${message.size}`
      ),
      readyMs: Math.round(crashSession.readyMs),
      recovery: { ...recovery, messages: strings(recovery.messages) },
      uploadMs: Math.round(crashUploadMs)
    },
    selection: {
      ...selection,
      messages: strings(selection.messages),
      readyMs: Math.round(selectionSession.readyMs),
      uploadMs: Math.round(selectionUploadMs)
    },
    syntax,
    text: {
      immediate: await textProbe(0),
      delayed: await textProbe(2_000)
    }
  }

  await writeFile(resolve(OUTPUT_DIRECTORY, 'trap-results.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.close()
  server.stop(true)
}
