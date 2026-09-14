import { expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import sharp from 'sharp'
import { PhotopeaBridge, PhotopeaDocumentLoader, type PhotopeaMessage, type PhotopeaTransport } from '../../src/editor'

class ImageTransport implements PhotopeaTransport {
  readonly viewport = { width: 1440, height: 900 }
  readonly messages: PhotopeaMessage[] = []
  readonly sent: Array<string | Uint8Array> = []
  readonly pressed: string[] = []
  readonly documents = [{ name: 'original', source: 'original.png', width: 32, height: 16 }]
  readonly app = {
    documents: this.documents,
    activeDocument: this.documents[0]!,
    UI: { fitTheArea() {} },
    echoToOE: (value: string) => this.messages.push({ type: 'text', value })
  }

  async boot(): Promise<void> {
    this.messages.push({ type: 'text', value: 'done' })
  }

  async send(message: string | Uint8Array): Promise<void> {
    this.sent.push(message)
    if (typeof message === 'string') {
      runInNewContext(message, { app: this.app })
    } else {
      // Model only the external editor: a failed decode emits done without a document.
      try {
        const { info } = await sharp(message).raw().toBuffer({ resolveWithObject: true })
        const document = { name: 'file', source: 'file', width: info.width, height: info.height }
        this.documents.push(document)
        this.app.activeDocument = document
      } catch {}
      this.messages.push({ type: 'text', value: 'done' })
    }
  }

  async nextMessage(): Promise<PhotopeaMessage> {
    const message = this.messages.shift()
    if (!message) throw new Error('No editor message available')
    return message
  }

  async press(key: string): Promise<void> {
    this.pressed.push(`${key}:${this.app.activeDocument.source}`)
  }

  async reload(): Promise<void> {}
}

function image(width = 32, height = 16): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#558899' } })
    .png()
    .toBuffer()
}

test.each([1, 2])('an overlapping failed decode cannot claim another upload across %i loader(s)', async (count) => {
  const bytes = await image()
  const transport = new ImageTransport()
  const bridge = new PhotopeaBridge(transport)
  const loader = new PhotopeaDocumentLoader(bridge)
  const secondLoader = count === 1 ? loader : new PhotopeaDocumentLoader(bridge)

  const results = await Promise.allSettled([
    loader.open(bytes.subarray(0, 33), 'truncated.png'),
    secondLoader.open(bytes, 'valid.png')
  ])

  expect(results).toMatchObject([
    { status: 'rejected', reason: { code: 'photopea_document_mismatch' } },
    { status: 'fulfilled', value: { filename: 'valid.png', width: 32, height: 16 } }
  ])
  expect(transport.documents.map((document) => document.source)).toEqual(['original.png', 'valid.png'])
  expect(transport.pressed).toEqual(['v:valid.png'])
})

test.each([1, 2])('overlapping valid uploads keep invocation order across %i loader(s)', async (count) => {
  const first = await image(32, 16)
  const second = await image(16, 32)
  const transport = new ImageTransport()
  const bridge = new PhotopeaBridge(transport)
  const loader = new PhotopeaDocumentLoader(bridge)
  const secondLoader = count === 1 ? loader : new PhotopeaDocumentLoader(bridge)

  const results = await Promise.allSettled([loader.open(first, 'first.png'), secondLoader.open(second, 'second.png')])

  expect(results).toMatchObject([
    { status: 'fulfilled', value: { filename: 'first.png', width: 32, height: 16 } },
    { status: 'fulfilled', value: { filename: 'second.png', width: 16, height: 32 } }
  ])
  expect(transport.documents.map((document) => document.source)).toEqual(['original.png', 'first.png', 'second.png'])
  expect(transport.pressed).toEqual(['v:first.png', 'v:second.png'])
})

test('holds the workflow through tool selection and continues after a tool failure', async () => {
  const bytes = await image()
  const transport = new ImageTransport()
  const loader = new PhotopeaDocumentLoader(new PhotopeaBridge(transport))
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  let toolCalls = 0
  transport.press = async () => {
    if (++toolCalls === 1) {
      entered.resolve()
      await release.promise
      throw new Error('tool failed')
    }
  }

  const first = loader.open(bytes, 'first.png')
  await entered.promise
  const sentBeforeSecond = transport.sent.length
  const second = loader.open(bytes, 'second.png')
  const results = Promise.allSettled([first, second])
  await new Promise<void>((resolve) => setImmediate(resolve))
  const sentWhileToolPending = transport.sent.length
  release.resolve()

  expect(await results).toMatchObject([
    { status: 'rejected', reason: { message: 'tool failed' } },
    { status: 'fulfilled', value: { filename: 'second.png' } }
  ])
  expect(sentWhileToolPending).toBe(sentBeforeSecond)
  expect(transport.documents.map((document) => document.source)).toEqual(['original.png', 'first.png', 'second.png'])
})

test('validates and copies queued inputs before waiting for browser work', async () => {
  const bytes = await image()
  const queuedBytes = await image(16, 32)
  const transport = new ImageTransport()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  transport.boot = async () => {
    entered.resolve()
    await release.promise
    transport.messages.push({ type: 'text', value: 'done' })
  }
  const loader = new PhotopeaDocumentLoader(new PhotopeaBridge(transport))
  const first = loader.open(bytes, 'first.png')
  await entered.promise
  const second = loader.open(queuedBytes, 'second.png')
  queuedBytes[0] = 0
  let validationError: unknown
  const invalid = loader.open(Uint8Array.of(1), 'bad.gif').catch((error: unknown) => {
    validationError = error
  })
  await new Promise<void>((resolve) => setImmediate(resolve))
  const earlyError = validationError
  const sentBeforeBoot = transport.sent.length
  release.resolve()
  const results = await Promise.allSettled([first, second])
  await invalid

  expect(earlyError).toMatchObject({ code: 'unsupported_image_format' })
  expect(sentBeforeBoot).toBe(0)
  expect(results).toMatchObject([
    { status: 'fulfilled', value: { filename: 'first.png' } },
    { status: 'fulfilled', value: { filename: 'second.png', width: 16, height: 32 } }
  ])
})

test('a pending open on another bridge does not block an independent editor', async () => {
  const bytes = await image()
  const firstTransport = new ImageTransport()
  const secondTransport = new ImageTransport()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  firstTransport.boot = async () => {
    entered.resolve()
    await release.promise
    firstTransport.messages.push({ type: 'text', value: 'done' })
  }
  let independentBootStarted = false
  secondTransport.boot = async () => {
    independentBootStarted = true
    secondTransport.messages.push({ type: 'text', value: 'done' })
  }

  const first = new PhotopeaDocumentLoader(new PhotopeaBridge(firstTransport)).open(bytes, 'first.png')
  await entered.promise
  const second = new PhotopeaDocumentLoader(new PhotopeaBridge(secondTransport)).open(bytes, 'second.png')
  await new Promise<void>((resolve) => setImmediate(resolve))
  const startedWhileFirstPending = independentBootStarted
  release.resolve()
  await Promise.all([first, second])

  expect(startedWhileFirstPending).toBe(true)
})
