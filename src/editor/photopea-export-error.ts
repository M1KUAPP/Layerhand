export type PhotopeaExportErrorCode =
  | 'photopea_no_document'
  | 'photopea_export_response'
  | 'photopea_invalid_psd'
  | 'photopea_invalid_png'
  | 'photopea_layer_tree_changed'
  | 'photopea_invalid_layer_name'

export class PhotopeaExportError extends Error {
  constructor(
    readonly code: PhotopeaExportErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'PhotopeaExportError'
  }
}
