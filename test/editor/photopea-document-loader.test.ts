import { expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import { PhotopeaDocumentLoader, type PhotopeaDocumentBridge } from '../../src/editor/photopea-document-loader'
import type { PhotopeaMessage } from '../../src/editor/photopea-transport'
import { png } from './support/image-headers'

class RecordingBridge implements PhotopeaDocumentBridge {
  readonly calls: string[] = []
  readonly scripts: string[] = []
  messages: readonly PhotopeaMessage[] = []

  async boot(): Promise<void> {
    this.calls.push('boot')
  }

  async openFile(): Promise<void> {
    this.calls.push('openFile')
  }

  async runScript(script: string): Promise<readonly PhotopeaMessage[]> {
    this.calls.push('runScript')
    this.scripts.push(script)
    return this.messages
  }

  async press(key: string): Promise<void> {
    this.calls.push(`press:${key}`)
  }
}

test('opens, verifies, fits, and selects the Move tool', async () => {
  const bridge = new RecordingBridge()
  bridge.messages = [{ type: 'text', value: 'layerhand:document:6000:1:wide%20photo.png' }]
  const times = [100, 137]
  const loader = new PhotopeaDocumentLoader(bridge, { now: () => times.shift()! })

  const result = await loader.open(png(6000, 1), 'wide photo.png')

  expect(bridge.calls).toEqual(['boot', 'openFile', 'runScript', 'press:v'])
  expect(bridge.scripts[0]).toContain('app.UI.fitTheArea();')
  expect(bridge.scripts[0]).toContain('wide photo.png')
  expect(result).toEqual({ filename: 'wide photo.png', format: 'png', width: 6000, height: 1, loadMs: 37 })
})

test('rejects invalid bytes before bridge boot', async () => {
  const bridge = new RecordingBridge()
  const loader = new PhotopeaDocumentLoader(bridge)

  await expect(loader.open(Uint8Array.of(1), 'bad.gif')).rejects.toMatchObject({ code: 'unsupported_image_format' })
  expect(bridge.calls).toEqual([])
})

test.each([
  ['mismatched dimensions', ['layerhand:document:2:1:image.png']],
  ['mismatched height', ['layerhand:document:1:2:image.png']],
  ['missing metadata', ['done']],
  ['duplicate metadata', ['layerhand:document:1:1:image.png', 'layerhand:document:1:1:image.png']],
  ['malformed numeric fields', ['layerhand:document:1x:1:image.png']],
  ['zero width', ['layerhand:document:0:1:image.png']],
  ['negative height', ['layerhand:document:1:-1:image.png']],
  ['fractional width', ['layerhand:document:1.5:1:image.png']],
  ['decimal integer', ['layerhand:document:1.0:1:image.png']],
  ['exponent', ['layerhand:document:1e0:1:image.png']],
  ['numeric whitespace', ['layerhand:document:1\n:1:image.png']],
  ['empty numeric field', ['layerhand:document::1:image.png']],
  ['infinity', ['layerhand:document:Infinity:1:image.png']],
  ['unsafe integer', ['layerhand:document:9007199254740993:1:image.png']],
  ['decoded filename mismatch', ['layerhand:document:1:1:other%20image.png']],
  ['malformed filename encoding', ['layerhand:document:1:1:%ZZ']],
  ['extra fields', ['layerhand:document:1:1:image.png:extra']],
  ['missing fields', ['layerhand:document:1:1']]
])('rejects %s before selecting the tool', async (_label, values) => {
  const bridge = new RecordingBridge()
  bridge.messages = values.map((value) => ({ type: 'text', value }))
  const loader = new PhotopeaDocumentLoader(bridge)

  await expect(loader.open(png(1, 1), 'image.png')).rejects.toMatchObject({
    name: 'PhotopeaDocumentError',
    code: 'photopea_document_mismatch',
    message: 'Photopea opened a document that does not match the uploaded image.'
  })
  expect(bridge.calls).toEqual(['boot', 'openFile', 'runScript'])
})

test('escapes filenames without modern JavaScript syntax', async () => {
  const bridge = new RecordingBridge()
  bridge.messages = [{ type: 'text', value: 'layerhand:document:1:1:a%22b.png' }]
  await new PhotopeaDocumentLoader(bridge).open(png(1, 1), 'a"b.png')

  expect(bridge.scripts[0]).not.toMatch(/=>|`|for\s*\([^)]*\sof\s/)
  expect(bridge.scripts[0]).toContain('a\\"b.png')
})

test('verifies the full source filename when Photopea truncates document labels at the first period', async () => {
  let label = 'file'
  let assignedLabel = 'file'
  const document = {
    width: 1,
    height: 1,
    source: 'file',
    get name() {
      return label
    },
    set name(value: string) {
      assignedLabel = value
      label = value.split('.')[0]!
    }
  }
  const bridge = new RecordingBridge()
  bridge.runScript = async (script) => {
    const messages: PhotopeaMessage[] = []
    runInNewContext(script, {
      app: {
        activeDocument: document,
        UI: { fitTheArea() {} },
        echoToOE: (value: string) => messages.push({ type: 'text', value })
      }
    })
    return messages
  }

  const result = await new PhotopeaDocumentLoader(bridge).open(png(1, 1), 'retouch.v2.png')

  expect(result.filename).toBe('retouch.v2.png')
  expect(document.source).toBe('retouch.v2.png')
  expect(assignedLabel).toBe('retouch.v2')
  expect(document.name).toBe('retouch')
  expect(bridge.calls).toEqual(['boot', 'openFile', 'press:v'])
})

test('rejects a source identifier mismatch even when the document label matches', async () => {
  const document = { name: '', width: 1, height: 1 }
  Object.defineProperty(document, 'source', {
    get: () => 'other.png',
    set: () => {}
  })
  const bridge = new RecordingBridge()
  bridge.runScript = async (script) => {
    const messages: PhotopeaMessage[] = []
    runInNewContext(script, {
      app: {
        activeDocument: document,
        UI: { fitTheArea() {} },
        echoToOE: (value: string) => messages.push({ type: 'text', value })
      }
    })
    return messages
  }

  await expect(new PhotopeaDocumentLoader(bridge).open(png(1, 1), 'image')).rejects.toMatchObject({
    code: 'photopea_document_mismatch'
  })
  expect(document.name).toBe('image')
  expect(bridge.calls).toEqual(['boot', 'openFile'])
})

test('the generated script preserves special filenames and fits before emitting rounded metadata', async () => {
  const filename = 'a\\"\'\r\n\u2028\u2029:雪.png'
  const bridge = new RecordingBridge()
  bridge.messages = [
    { type: 'text', value: 'layerhand:document:1:1:a%5C%22%27%0D%0A%E2%80%A8%E2%80%A9%3A%E9%9B%AA.png' }
  ]
  await new PhotopeaDocumentLoader(bridge).open(png(1, 1), filename)
  const document = { name: '', source: '', width: 1.2, height: 0.8 }
  const effects: string[] = []

  runInNewContext(bridge.scripts[0]!, {
    app: {
      activeDocument: document,
      UI: { fitTheArea: () => effects.push('fit') },
      echoToOE: (value: string) => effects.push(value)
    }
  })

  expect(document.name).toBe('a\\"\'\r\n\u2028\u2029:雪')
  expect(document.source).toBe(filename)
  expect(effects).toEqual(['fit', "layerhand:document:1:1:a%5C%22'%0D%0A%E2%80%A8%E2%80%A9%3A%E9%9B%AA.png"])
  expect(bridge.scripts[0]).not.toMatch(/[\u2028\u2029]/)
})

test('times the open through tool selection, excluding boot, and sends validated bytes', async () => {
  const bridge = new RecordingBridge()
  bridge.messages = [{ type: 'text', value: 'layerhand:document:1:1:image.png' }]
  const source = png(1, 1)
  let clock = 0
  let sent: Uint8Array | undefined
  const timedBridge: PhotopeaDocumentBridge = {
    boot: async () => {
      clock = 100
      source[0] = 0
    },
    openFile: async (bytes) => {
      sent = bytes
      clock += 10
    },
    runScript: async (script) => {
      clock += 20
      return bridge.runScript(script)
    },
    press: async () => {
      clock += 7
    }
  }

  const result = await new PhotopeaDocumentLoader(timedBridge, { now: () => clock }).open(source, 'image.png')

  expect(result.loadMs).toBe(37)
  expect(sent).toEqual(png(1, 1))
  expect(sent).not.toBe(source)
})
