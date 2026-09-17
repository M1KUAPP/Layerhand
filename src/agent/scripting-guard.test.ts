import { describe, expect, test } from 'bun:test'
import type { ComputerAction } from '../editor/session'
import { isScriptedTyping } from './scripting-guard'

const typed = (text: string): ComputerAction => ({ type: 'type', text })
const CLICK: ComputerAction = { type: 'click', button: 'left', x: 720, y: 450 }

describe('isScriptedTyping', () => {
  test.each(["app.activeDocument.saveToOE('psd')", 'app.echoToOE("done")', 'saveToOE', 'echoToOE'])(
    'flags typed text that reaches Photopea scripting: %s',
    (text) => {
      expect(isScriptedTyping(typed(text))).toBe(true)
    }
  )

  test('does not flag ordinary typed text', () => {
    expect(isScriptedTyping(typed('Warm highlights'))).toBe(false)
  })

  test.each(['Shop the app.', 'our app. today'])(
    'does not flag ordinary text that happens to contain "app.": %s',
    (text) => {
      expect(isScriptedTyping(typed(text))).toBe(false)
    }
  )

  test('does not flag a non-type action', () => {
    expect(isScriptedTyping(CLICK)).toBe(false)
  })
})
