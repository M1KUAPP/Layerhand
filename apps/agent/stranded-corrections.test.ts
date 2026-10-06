import { describe, expect, test } from 'bun:test'
import { describeStrandedCorrections, strandedCorrectionNumbers } from './stranded-corrections'

describe('describeStrandedCorrections', () => {
  test('names one correction singularly', () => {
    expect(describeStrandedCorrections([1])).toBe('The run stopped before correction 1 reached the agent.')
  })

  test('names two corrections with "and", no comma', () => {
    expect(describeStrandedCorrections([2, 3])).toBe('The run stopped before corrections 2 and 3 reached the agent.')
  })

  test('names three or more corrections as a comma list ending in "and"', () => {
    expect(describeStrandedCorrections([2, 3, 4])).toBe(
      'The run stopped before corrections 2, 3 and 4 reached the agent.'
    )
  })
})

describe('strandedCorrectionNumbers', () => {
  test('round-trips describeStrandedCorrections for one, two, and three numbers', () => {
    for (const numbers of [[1], [1, 5], [2, 3], [2, 3, 4], [1, 2, 3, 10]]) {
      expect(strandedCorrectionNumbers(describeStrandedCorrections(numbers))).toEqual(numbers)
    }
  })

  test('recognises the exact singular and plural wording', () => {
    expect(strandedCorrectionNumbers('The run stopped before correction 1 reached the agent.')).toEqual([1])
    expect(strandedCorrectionNumbers('The run stopped before corrections 2 and 3 reached the agent.')).toEqual([2, 3])
  })

  test('is undefined for unrelated messages, including other recoverable errors', () => {
    expect(strandedCorrectionNumbers('The live view missed a frame')).toBeUndefined()
    expect(strandedCorrectionNumbers('The model stopped answering, so the run stopped')).toBeUndefined()
    expect(strandedCorrectionNumbers('')).toBeUndefined()
  })
})
