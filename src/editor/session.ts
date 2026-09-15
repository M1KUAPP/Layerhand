export interface EditorSession {
  readonly id: string
  readonly viewport: Viewport

  open(image: Uint8Array, filename: string): Promise<void>
  screenshot(): Promise<Uint8Array> // PNG of the viewport. The live view may call it during any other call.
  act(actions: ComputerAction[]): Promise<void>
  layers(): Promise<LayerInfo[]>
  exportPsd(): Promise<Uint8Array>
  exportPreview(): Promise<Uint8Array> // Flattened document PNG, FR-28.
  close(): Promise<void>
}

export type Pt = { x: number; y: number }

export type ComputerAction =
  | ({ type: 'click'; button: Button; keys?: string[] } & Pt)
  | ({ type: 'double_click'; keys?: string[] } & Pt)
  | ({ type: 'move'; keys?: string[] } & Pt)
  | { type: 'drag'; path: Pt[]; keys?: string[] }
  | ({
      type: 'scroll'
      scroll_x: number
      scroll_y: number
      keys?: string[]
    } & Pt)
  | { type: 'keypress'; keys: string[] }
  | { type: 'type'; text: string }
  | { type: 'wait' }
  | { type: 'screenshot' }

export type Button = 'left' | 'right' | 'wheel' | 'back' | 'forward'

export interface Viewport {
  width: number
  height: number
}

export type LayerKind = 'raster' | 'adjustment' | 'group'

export type LayerMaskKind = 'pixel' | 'vector'

export interface LayerMaskInfo {
  readonly kind: LayerMaskKind
  readonly enabled: boolean
}

export interface LayerInfo {
  readonly name: string
  readonly kind: LayerKind
  readonly visible: boolean
  readonly masks: readonly LayerMaskInfo[]
  readonly children: readonly LayerInfo[]
}
