// The one detector for a `type` action that would reach Photopea's
// scripting interface through the computer tool: its only route in is its
// own script dialog (docs/TRD.md § The line that protects the premise).
// Shared by the agent loop, which refuses to carry such an action out, and
// the driving-mechanism spike harness, which counts how often a run
// attempts one, so the two can never drift apart (#109).
import type { ComputerAction } from '../editor/session'

const SCRIPTED_TYPING_PATTERN = /app\.\w|echoToOE|saveToOE/

export function isScriptedTyping(action: ComputerAction): action is Extract<ComputerAction, { type: 'type' }> {
  return action.type === 'type' && SCRIPTED_TYPING_PATTERN.test(action.text)
}
