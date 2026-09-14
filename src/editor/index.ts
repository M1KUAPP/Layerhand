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
export type { Button, ComputerAction, EditorSession, LayerInfo, Pt, Viewport } from './session'
