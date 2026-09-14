import { expect, test } from 'bun:test'
import type { Button, ComputerAction, EditorSession, LayerInfo, Pt, Viewport } from '../../src/editor'

type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type Assert<T extends true> = T

type KeysOfUnion<T> = T extends unknown ? keyof T : never

type ExpectedAction =
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

interface ExpectedSession {
  readonly id: string
  readonly viewport: Viewport
  open(image: Uint8Array, filename: string): Promise<void>
  screenshot(): Promise<Uint8Array>
  act(actions: ComputerAction[]): Promise<void>
  layers(): Promise<LayerInfo[]>
  exportPsd(): Promise<Uint8Array>
  exportPreview(): Promise<Uint8Array>
  close(): Promise<void>
}

type Assertions = [
  Assert<IsExact<Button, 'left' | 'right' | 'wheel' | 'back' | 'forward'>>,
  Assert<IsExact<Pt, { x: number; y: number }>>,
  Assert<IsExact<Viewport, { width: number; height: number }>>,
  Assert<
    IsExact<
      LayerInfo,
      {
        name: string
        kind: 'raster' | 'mask' | 'adjustment' | 'group'
        visible: boolean
      }
    >
  >,
  Assert<IsExact<ComputerAction, ExpectedAction>>,
  Assert<IsExact<KeysOfUnion<ComputerAction>, KeysOfUnion<ExpectedAction>>>,
  Assert<IsExact<EditorSession, ExpectedSession>>,
  Assert<IsExact<keyof EditorSession, keyof ExpectedSession>>
]

function assertReadonlySessionMembers(session: EditorSession): void {
  // @ts-expect-error EditorSession.id is readonly.
  session.id = 'replacement'
  // @ts-expect-error EditorSession.viewport is readonly.
  session.viewport = { width: 1, height: 1 }
}

void assertReadonlySessionMembers

test('exports the exact editor session contract', () => {
  const assertions: Assertions = [true, true, true, true, true, true, true, true]
  expect(assertions.every(Boolean)).toBe(true)
})
