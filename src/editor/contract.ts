// Contract 1, the editor session, as docs/TRD.md specifies it. Only the types a
// run carries to the page are here so far; EditorSession and ComputerAction
// join them with the editor session and its fake.

export interface Viewport {
  width: number
  height: number
}

export interface LayerInfo {
  name: string
  kind: 'raster' | 'mask' | 'adjustment' | 'group'
  visible: boolean
}
