export { FakeEditorSession, createRecordedFakeEditorSession, type EditorRecording } from './fake-editor-session'
export {
  ImageUploadError,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_EDGE,
  validateImageUpload,
  type ImageFormat,
  type ImageUploadErrorCode,
  type ValidatedImageUpload
} from './image-upload'
export { createPhotopeaHostHtml } from './photopea-host'
export { photopeaScriptString } from './photopea-script'
export { selectPngExport, selectPsdExport } from './export-binary'
export {
  PhotopeaDocumentExporter,
  type PhotopeaDocumentExporterOptions,
  type PhotopeaExportSnapshot
} from './photopea-document-exporter'
export {
  PhotopeaDocumentError,
  PhotopeaDocumentLoader,
  type LoadedPhotopeaDocument,
  type PhotopeaDocumentBridge
} from './photopea-document-loader'
export {
  PhotopeaBridge,
  PhotopeaProtocolError,
  type PhotopeaBridgeOptions,
  type PhotopeaProtocolErrorCode
} from './photopea-bridge'
export {
  PHOTOPEA_CONFIGURATION,
  PHOTOPEA_ORIGIN,
  type PhotopeaConfiguration,
  type PhotopeaMessage,
  type PhotopeaTransport
} from './photopea-transport'
export {
  PlaywrightPhotopeaTransport,
  decodePhotopeaWireMessage,
  type PlaywrightPhotopeaTransportOptions
} from './playwright-photopea-transport'
export { cloneLayerInfo, cloneLayerTree } from './layer-tree'
export {
  assertLayerNames,
  buildLayerRenamePlan,
  normalizeLayerName,
  type LayerPath,
  type LayerRename
} from './layer-names'
export { assertCompleteLayerTree, LayerCompletionError, type LayerCompletionErrorCode } from './layer-tree-policy'
export { PhotopeaExportError, type PhotopeaExportErrorCode } from './photopea-export-error'
export {
  PhotopeaActionRunner,
  type AuxiliaryButton,
  type AuxiliaryMouse,
  type PhotopeaActionPage,
  type PhotopeaActionRunnerOptions
} from './photopea-action-runner'
export { createPlaywrightAuxiliaryMouse } from './playwright-auxiliary-mouse'
export {
  parsePsdMetadata,
  toLayerInfoTree,
  type AdjustmentType,
  type ParsedLayerInfo,
  type ParsedPsdMetadata
} from './psd-metadata'
export type {
  Button,
  ComputerAction,
  EditorSession,
  LayerInfo,
  LayerKind,
  LayerMaskInfo,
  LayerMaskKind,
  Pt,
  Viewport
} from './session'
