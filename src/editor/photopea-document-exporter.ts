import { selectPngExport, selectPsdExport } from './export-binary'
import { assertLayerNames, buildLayerRenamePlan, type LayerRename } from './layer-names'
import type { PhotopeaDocumentBridge } from './photopea-document-loader'
import { PhotopeaExportError } from './photopea-export-error'
import { photopeaScriptString } from './photopea-script'
import type { PhotopeaMessage } from './photopea-transport'
import { parsePsdMetadata, toLayerInfoTree, type ParsedLayerInfo } from './psd-metadata'
import type { LayerInfo } from './session'

export interface PhotopeaExportSnapshot {
  readonly psd: Uint8Array
  readonly preview: Uint8Array
  readonly layers: readonly LayerInfo[]
}

export interface PhotopeaDocumentExporterOptions {
  readonly createBeginMarker?: () => string
}

const NO_DOCUMENT = 'layerhand:no-document'
const SOURCE_NAMED = 'layerhand:source-named:Original%20photograph'
const RENAMED = 'layerhand:layers-renamed'
const TREE_CHANGED = 'layerhand:layer-tree-changed'

function responseError(): PhotopeaExportError {
  return new PhotopeaExportError('photopea_export_response', 'Photopea returned an ambiguous export response.')
}

function noDocumentError(): PhotopeaExportError {
  return new PhotopeaExportError('photopea_no_document', 'Photopea has no active document.')
}

function verifyResult(messages: readonly PhotopeaMessage[], prefix: string, success: string, failure: string): void {
  const results = messages.filter(
    (message) =>
      message.type === 'text' &&
      (message.value.startsWith(prefix) || message.value === failure || message.value === NO_DOCUMENT)
  )
  if (results.length !== 1 || results[0]?.type !== 'text') throw responseError()
  if (results[0].value === NO_DOCUMENT) throw noDocumentError()
  if (results[0].value === TREE_CHANGED) {
    throw new PhotopeaExportError('photopea_layer_tree_changed', 'Photopea layers changed before naming.')
  }
  if (results[0].value !== success) throw responseError()
}

function expectedTree(
  layers: readonly ParsedLayerInfo[],
  plan: readonly LayerRename[],
  path: readonly number[] = []
): string {
  return (
    '[' +
    layers
      .map((layer, index) => {
        const nextPath = [...path, index]
        const replacement = plan.find((rename) => rename.path.join('.') === nextPath.join('.'))?.to
        return (
          '{name:' +
          photopeaScriptString(layer.name) +
          ',kind:' +
          photopeaScriptString(layer.kind) +
          ',childCount:' +
          layer.children.length +
          ',replacement:' +
          (replacement === undefined ? 'null' : photopeaScriptString(replacement)) +
          ',children:' +
          expectedTree(layer.children, plan, nextPath) +
          '}'
        )
      })
      .join(',') +
    ']'
  )
}

function renameScript(layers: readonly ParsedLayerInfo[], plan: readonly LayerRename[]): string {
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
  return `var expected = ${expectedTree(layers, plan)};
function classify(layer) {
  if (layer.typename === "LayerSet") return "group";
  var kind = layer.kind;
  if (${adjustmentKinds.map((kind) => `kind === LayerKind.${kind}`).join(' || ')}) return "adjustment";
  return "raster";
}
function matches(container, nodes) {
  if (container.layers.length !== nodes.length) return false;
  for (var i = 0; i < nodes.length; i++) {
    var live = container.layers[container.layers.length - 1 - i];
    var node = nodes[i];
    var kind = classify(live);
    if (live.name !== node.name || kind !== node.kind) return false;
    var childCount = kind === "group" ? live.layers.length : 0;
    if (childCount !== node.childCount) return false;
    if (kind === "group" && !matches(live, node.children)) return false;
  }
  return true;
}
function rename(container, nodes) {
  for (var i = 0; i < nodes.length; i++) {
    var live = container.layers[container.layers.length - 1 - i];
    var node = nodes[i];
    if (node.replacement !== null) live.name = node.replacement;
    if (node.kind === "group") rename(live, node.children);
  }
}
if (app.documents.length === 0) {
  app.echoToOE(${photopeaScriptString(NO_DOCUMENT)});
} else if (!matches(app.activeDocument, expected)) {
  app.echoToOE(${photopeaScriptString(TREE_CHANGED)});
} else {
  rename(app.activeDocument, expected);
  app.echoToOE(${photopeaScriptString(RENAMED)});
}`
}

export class PhotopeaDocumentExporter {
  readonly #bridge: PhotopeaDocumentBridge
  readonly #createBeginMarker: () => string

  constructor(bridge: PhotopeaDocumentBridge, options: PhotopeaDocumentExporterOptions = {}) {
    this.#bridge = bridge
    this.#createBeginMarker = options.createBeginMarker ?? (() => `layerhand:export-begin:${crypto.randomUUID()}`)
  }

  async nameSourceLayer(): Promise<void> {
    const messages = await this.#bridge.runScript(
      'if (app.documents.length === 0) {\n' +
        `app.echoToOE(${photopeaScriptString(NO_DOCUMENT)});\n` +
        '} else {\n' +
        'app.activeDocument.activeLayer.name = "Original photograph";\n' +
        'app.echoToOE("layerhand:source-named:" + encodeURIComponent(app.activeDocument.activeLayer.name));\n}'
    )
    verifyResult(messages, 'layerhand:source-named:', SOURCE_NAMED, NO_DOCUMENT)
  }

  async #export(format: 'psd' | 'png'): Promise<Uint8Array> {
    const marker = this.#createBeginMarker()
    const messages = await this.#bridge.runScript(
      `app.echoToOE(${photopeaScriptString(marker)});\n` +
        'if (app.documents.length === 0) {\n' +
        `app.echoToOE(${photopeaScriptString(NO_DOCUMENT)});\n` +
        `} else {\napp.activeDocument.saveToOE(${photopeaScriptString(format)});\n}`
    )
    const markers = messages.flatMap((message, index) =>
      message.type === 'text' && message.value === marker ? [index] : []
    )
    if (markers.length !== 1) throw responseError()
    const after = messages.slice(markers[0]! + 1)
    const noDocument = after.filter((message) => message.type === 'text' && message.value === NO_DOCUMENT)
    if (noDocument.length) {
      if (noDocument.length !== 1 || after.some((message) => message.type === 'bytes')) throw responseError()
      throw noDocumentError()
    }
    return format === 'psd' ? selectPsdExport(messages, marker) : selectPngExport(messages, marker)
  }

  async exportSnapshot(): Promise<PhotopeaExportSnapshot> {
    let psd: Uint8Array | undefined = await this.#export('psd')
    let metadata = parsePsdMetadata(psd)
    const plan = buildLayerRenamePlan(metadata.layers)
    if (plan.length) {
      // The renamed export replaces this one, so a large file is not held twice while it is read (#100).
      psd = undefined
      const messages = await this.#bridge.runScript(renameScript(metadata.layers, plan))
      verifyResult(messages, 'layerhand:layers-renamed', RENAMED, TREE_CHANGED)
      psd = await this.#export('psd')
      metadata = parsePsdMetadata(psd)
    }
    const layers = toLayerInfoTree(metadata.layers)
    assertLayerNames(layers)
    const preview = await this.#export('png')
    return { psd, preview, layers }
  }
}
