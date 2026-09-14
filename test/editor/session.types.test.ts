import { expect, test } from 'bun:test'
import type { Button, ComputerAction, EditorSession, LayerInfo, Pt, Viewport } from '../../src/editor'

type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type Assert<T extends true> = T

type KeysOfUnion<T> = T extends unknown ? keyof T : never

type MethodIsExact<Name extends keyof EditorSession, Args extends unknown[], Result> = EditorSession[Name] extends (
  ...args: infer ActualArgs
) => infer ActualResult
  ? IsExact<ActualArgs, Args> extends true
    ? IsExact<ActualResult, Result>
    : false
  : false

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

type ActionVariantKeyChecks = {
  [Type in ComputerAction['type']]: IsExact<
    keyof Extract<ComputerAction, { type: Type }>,
    keyof Extract<ExpectedAction, { type: Type }>
  >
}[ComputerAction['type']]

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
  Assert<IsExact<keyof Pt, 'x' | 'y'>>,
  Assert<IsExact<Viewport, { width: number; height: number }>>,
  Assert<IsExact<keyof Viewport, 'width' | 'height'>>,
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
  Assert<IsExact<keyof LayerInfo, 'name' | 'kind' | 'visible'>>,
  Assert<IsExact<ComputerAction, ExpectedAction>>,
  Assert<IsExact<KeysOfUnion<ComputerAction>, KeysOfUnion<ExpectedAction>>>,
  Assert<IsExact<ActionVariantKeyChecks, true>>,
  Assert<IsExact<EditorSession, ExpectedSession>>,
  Assert<IsExact<keyof EditorSession, keyof ExpectedSession>>,
  Assert<MethodIsExact<'open', [image: Uint8Array, filename: string], Promise<void>>>,
  Assert<MethodIsExact<'screenshot', [], Promise<Uint8Array>>>,
  Assert<MethodIsExact<'act', [actions: ComputerAction[]], Promise<void>>>,
  Assert<MethodIsExact<'layers', [], Promise<LayerInfo[]>>>,
  Assert<MethodIsExact<'exportPsd', [], Promise<Uint8Array>>>,
  Assert<MethodIsExact<'exportPreview', [], Promise<Uint8Array>>>,
  Assert<MethodIsExact<'close', [], Promise<void>>>
]

function assertReadonlySessionMembers(session: EditorSession): void {
  // @ts-expect-error EditorSession.id is readonly.
  session.id = 'replacement'
  // @ts-expect-error EditorSession.viewport is readonly.
  session.viewport = { width: 1, height: 1 }
}

void assertReadonlySessionMembers

test('exports the exact editor session contract', () => {
  const contractIsExact: Assertions[number] = true
  expect(contractIsExact).toBe(true)
})
