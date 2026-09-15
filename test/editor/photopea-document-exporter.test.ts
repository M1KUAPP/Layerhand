import { expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import type { Psd } from 'ag-psd'
import { PhotopeaDocumentExporter } from '../../src/editor/photopea-document-exporter'
import type { PhotopeaDocumentBridge } from '../../src/editor/photopea-document-loader'
import type { PhotopeaMessage } from '../../src/editor/photopea-transport'
import { exportPng } from './support/export-png'
import { psdBytes, rgba } from './support/psd-fixtures'

interface LiveLayer {
  name: string
  typename: string
  kind: string
  layers?: LiveLayer[]
}

const raster = (name: string): LiveLayer => ({ name, typename: 'ArtLayer', kind: 'NORMAL' })
const group = (name: string, layers: LiveLayer[]): LiveLayer => ({ name, typename: 'LayerSet', kind: '', layers })
const psd = (children: NonNullable<Psd['children']>): Uint8Array =>
  psdBytes({
    width: 1,
    height: 1,
    imageData: rgba(1, 1, [0, 0, 0, 255]),
    children
  })
const namedPsd = () => psd([{ name: 'Original photograph' }])
const adjustmentKinds = [
  'BLACKANDWHITE',
  'BRIGHTNESSCONTRAST',
  'CHANNELMIXER',
  'COLORBALANCE',
  'COLORLOOKUP',
  'CURVES',
  'EXPOSURE',
  'GRADIENTMAP',
  'HUESATURATION',
  'INVERSION',
  'LEVELS',
  'PHOTOFILTER',
  'POSTERIZE',
  'SELECTIVECOLOR',
  'THRESHOLD',
  'VIBRANCE'
]

class MemoryBridge implements PhotopeaDocumentBridge {
  readonly scripts: string[] = []
  readonly formats: string[] = []
  readonly batches: PhotopeaMessage[][] = []
  readonly layers: LiveLayer[] = [raster('Original photograph')]
  readonly exports: Uint8Array[] = []
  readonly responses: Array<readonly PhotopeaMessage[] | undefined> = []
  hasDocument = true
  beforeScript?: (index: number) => void

  async boot(): Promise<void> {}
  async openFile(): Promise<void> {}
  async press(): Promise<void> {}
  async runScript(script: string): Promise<readonly PhotopeaMessage[]> {
    this.beforeScript?.(this.scripts.length)
    this.scripts.push(script)
    const messages: PhotopeaMessage[] = []
    const document = {
      layers: this.layers,
      activeLayer: this.layers[0],
      saveToOE: (format: string) => {
        this.formats.push(format)
        const value = this.exports.shift()
        if (!value) throw new Error('Unexpected export')
        messages.push({ type: 'bytes', value })
      }
    }
    // Remove newer APIs so ES3-incompatible scripts fail behaviorally.
    runInNewContext(
      'String.prototype.normalize = undefined; String.prototype.trim = undefined; JSON = undefined;\n' + script,
      {
        app: {
          documents: this.hasDocument ? [document] : [],
          activeDocument: this.hasDocument ? document : undefined,
          echoToOE: (value: string) => messages.push({ type: 'text', value })
        },
        LayerKind: Object.fromEntries(adjustmentKinds.map((kind) => [kind, kind]))
      }
    )
    this.batches.push(messages)
    return this.responses.length ? (this.responses.shift() ?? messages) : messages
  }
}

function exporter(bridge: MemoryBridge) {
  let next = 0
  return new PhotopeaDocumentExporter(bridge, { createBeginMarker: () => `begin:${++next}` })
}

test('names the source and verifies exactly one Original photograph result', async () => {
  const bridge = new MemoryBridge()
  bridge.layers[0]!.name = 'Background'
  await exporter(bridge).nameSourceLayer()
  expect(bridge.layers[0]!.name).toBe('Original photograph')
  expect(bridge.batches).toEqual([[{ type: 'text', value: 'layerhand:source-named:Original%20photograph' }]])
})

test.each([
  [],
  [{ type: 'text', value: 'layerhand:source-named:Wrong' }],
  [
    { type: 'text', value: 'layerhand:source-named:Original%20photograph' },
    { type: 'text', value: 'layerhand:source-named:Original%20photograph' }
  ],
  [
    { type: 'text', value: 'layerhand:source-named:Original%20photograph' },
    { type: 'text', value: 'layerhand:no-document' }
  ]
] satisfies PhotopeaMessage[][])('rejects ambiguous or invalid source naming response %j', async (...messages) => {
  const bridge = new MemoryBridge()
  bridge.responses.push(messages)
  await expect(exporter(bridge).nameSourceLayer()).rejects.toMatchObject({ code: 'photopea_export_response' })
})

test('reports no document while naming the source', async () => {
  const bridge = new MemoryBridge()
  bridge.hasDocument = false
  await expect(exporter(bridge).nameSourceLayer()).rejects.toMatchObject({ code: 'photopea_no_document' })
})

test.each(['psd', 'png'])('reports no document during %s export without saving', async (format) => {
  const bridge = new MemoryBridge()
  bridge.exports.push(namedPsd())
  bridge.beforeScript = (index) => {
    if (index === (format === 'psd' ? 0 : 1)) bridge.hasDocument = false
  }
  await expect(exporter(bridge).exportSnapshot()).rejects.toMatchObject({ code: 'photopea_no_document' })
  expect(bridge.formats).toEqual(format === 'psd' ? [] : ['psd'])
  expect(bridge.batches.at(-1)).toEqual([
    { type: 'text', value: format === 'psd' ? 'begin:1' : 'begin:2' },
    { type: 'text', value: 'layerhand:no-document' }
  ])
})

test('returns the named candidate without a second PSD export and copies both formats', async () => {
  const bridge = new MemoryBridge()
  const candidate = namedPsd()
  const preview = exportPng()
  bridge.exports.push(candidate, preview)
  const snapshot = await exporter(bridge).exportSnapshot()
  expect(bridge.formats).toEqual(['psd', 'png'])
  expect(bridge.scripts).toHaveLength(2)
  expect(snapshot.psd).toEqual(candidate)
  expect(snapshot.preview).toEqual(preview)
  expect(snapshot.psd).not.toBe(candidate)
  expect(snapshot.preview).not.toBe(preview)
  expect(snapshot.layers).toEqual([
    { name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] }
  ])
  expect(
    bridge.batches.map((batch) => batch.map((message) => (message.type === 'text' ? message.value : 'bytes')))
  ).toEqual([
    ['begin:1', 'bytes'],
    ['begin:2', 'bytes']
  ])
})

test('preflights the whole tree, reverses every sibling index, and parses the renamed final PSD before preview', async () => {
  const bridge = new MemoryBridge()
  bridge.layers.splice(
    0,
    1,
    group('Group 1', [raster('Layer 1'), group('Group 2', [raster('Layer 2'), raster('Keep nested')])]),
    raster('Original photograph')
  )
  const candidate = psd([
    { name: 'Original photograph' },
    {
      name: 'Group 1',
      children: [{ name: 'Group 2', children: [{ name: 'Keep nested' }, { name: 'Layer 2' }] }, { name: 'Layer 1' }]
    }
  ])
  const final = psd([
    { name: 'Original photograph', hidden: true },
    {
      name: 'Retouching group',
      children: [
        { name: 'Retouching group 2', children: [{ name: 'Keep nested' }, { name: 'Retouched pixels' }] },
        { name: 'Retouched pixels 2' }
      ]
    }
  ])
  bridge.exports.push(candidate, final, exportPng())
  const snapshot = await exporter(bridge).exportSnapshot()
  expect(bridge.formats).toEqual(['psd', 'psd', 'png'])
  expect(bridge.scripts).toHaveLength(4)
  for (const script of bridge.scripts) expect(script).not.toMatch(/\b(?:const|let)\b|=>|`|for\s*\([^)]*\sof\s/)
  expect(bridge.layers[0]!.name).toBe('Retouching group')
  expect(bridge.layers[0]!.layers![0]!.name).toBe('Retouched pixels 2')
  expect(bridge.layers[0]!.layers![1]!.layers!.map((layer) => layer.name)).toEqual(['Retouched pixels', 'Keep nested'])
  expect(snapshot.psd).toEqual(final)
  expect(snapshot.layers[0]!.visible).toBe(false)
  expect(snapshot.layers[1]!.children[0]!.children[1]!.name).toBe('Retouched pixels')
  expect(
    bridge.batches.filter((batch) => batch.some((message) => message.type === 'bytes')).map((batch) => batch[0])
  ).toEqual([
    { type: 'text', value: 'begin:1' },
    { type: 'text', value: 'begin:2' },
    { type: 'text', value: 'begin:3' }
  ])
})

test.each(['name', 'kind', 'children', 'sibling count'])(
  'rejects a changed %s before any rename or final export',
  async (change) => {
    const bridge = new MemoryBridge()
    bridge.layers.splice(0, 1, raster('Keep this'), group('Group 1', [raster('Layer 1')]))
    bridge.exports.push(psd([{ name: 'Group 1', children: [{ name: 'Layer 1' }] }, { name: 'Keep this' }]))
    if (change === 'name') bridge.layers[0]!.name = 'Changed'
    if (change === 'kind') bridge.layers[0]!.kind = 'CURVES'
    if (change === 'children') bridge.layers[1]!.layers!.push(raster('Extra'))
    if (change === 'sibling count') bridge.layers.push(raster('Extra'))
    await expect(exporter(bridge).exportSnapshot()).rejects.toMatchObject({ code: 'photopea_layer_tree_changed' })
    expect(bridge.formats).toEqual(['psd'])
    expect(bridge.layers[1]!.name).toBe('Group 1')
    expect(bridge.layers[1]!.layers![0]!.name).toBe('Layer 1')
  }
)

test.each(['Layer 1', 'Original photograph'])('rejects invalid final name %s before preview', async (name) => {
  const bridge = new MemoryBridge()
  bridge.layers.splice(0, 1, raster('Layer 1'), raster('Original photograph'))
  bridge.exports.push(
    psd([{ name: 'Original photograph' }, { name: 'Layer 1' }]),
    psd([{ name: 'Original photograph' }, { name }])
  )
  await expect(exporter(bridge).exportSnapshot()).rejects.toMatchObject({ code: 'photopea_invalid_layer_name' })
  expect(bridge.formats).toEqual(['psd', 'psd'])
})

test('normalizes raw names after exact preflight and safely escapes script data', async () => {
  const bridge = new MemoryBridge()
  const raw = '  Cafe\u0301 \\"\u2028\u2029雪  '
  const finalName = 'Café \\" 雪'
  bridge.layers[0]!.name = raw
  bridge.exports.push(psd([{ name: raw }]), psd([{ name: finalName }]), exportPng())
  const snapshot = await exporter(bridge).exportSnapshot()
  expect(bridge.layers[0]!.name).toBe(finalName)
  expect(snapshot.layers[0]!.name).toBe(finalName)
  expect(bridge.scripts[1]).not.toMatch(/[\u2028\u2029]/)
})

test.each(adjustmentKinds)('classifies live %s as an adjustment', async (kind) => {
  const bridge = new MemoryBridge()
  bridge.layers[0] = { name: 'Layer 1', typename: 'ArtLayer', kind }
  bridge.exports.push(
    psd([{ name: 'Layer 1', adjustment: { type: 'curves' } }]),
    psd([{ name: 'Curves adjustment', adjustment: { type: 'curves' } }]),
    exportPng()
  )
  const snapshot = await exporter(bridge).exportSnapshot()
  expect(bridge.layers[0]!.name).toBe('Curves adjustment')
  expect(snapshot.layers[0]).toEqual({
    name: 'Curves adjustment',
    kind: 'adjustment',
    visible: true,
    masks: [],
    children: []
  })
})

test.each(['TEXT', 'SOLIDFILL', 'SMARTOBJECT', 'UNKNOWN'])('classifies other leaf kind %s as raster', async (kind) => {
  const bridge = new MemoryBridge()
  bridge.layers[0] = { name: 'Layer 1', typename: 'ArtLayer', kind }
  bridge.exports.push(psd([{ name: 'Layer 1' }]), psd([{ name: 'Retouched pixels' }]), exportPng())
  await exporter(bridge).exportSnapshot()
  expect(bridge.layers[0]!.name).toBe('Retouched pixels')
})
