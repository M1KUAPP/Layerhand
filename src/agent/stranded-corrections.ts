// The one wording for "a cancel or a cap stranded these acknowledged
// corrections", built by refuseCorrections() (loop.ts) and read back by
// correctionStatuses() (src/web/state.ts), so the two cannot drift apart
// (#124). Corrections are numbered in acknowledgement order, 1-based, which
// is the order the page lists them in and the order loop.ts assigns them:
// in agent mode the loop alone emits `correction_ack`, so a correction's
// number is its position in that list. Naming the exact numbers — rather
// than how many — matters under native steering: an earlier correction can
// still be waiting while a later one has already been applied, so "the last
// N" is not always the right N (a bug the wording used to have).
//
// No imports: both an agent-only module and the web bundle import this, and
// it must stay small enough to add to either without cost.
const SINGULAR = 'The run stopped before correction'
const PLURAL = 'The run stopped before corrections'
const SUFFIX = 'reached the agent.'

function joinNumbers(numbers: readonly number[]): string {
  if (numbers.length === 1) return String(numbers[0])
  return `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`
}

/** Names exactly which acknowledged corrections (1-based) never reached the agent. */
export function describeStrandedCorrections(numbers: readonly number[]): string {
  const prefix = numbers.length === 1 ? SINGULAR : PLURAL
  return `${prefix} ${joinNumbers(numbers)} ${SUFFIX}`
}

const MESSAGE_PATTERN = /^The run stopped before corrections? ([\d, ]+ and \d+|\d+) reached the agent\.$/

/** The corrections' 1-based numbers, if `message` is the wording above. */
export function strandedCorrectionNumbers(message: string): number[] | undefined {
  const match = MESSAGE_PATTERN.exec(message)
  const list = match?.[1]
  if (list === undefined) return undefined
  const numbers = list
    .split(/,| and /)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(Number)
  return numbers.every((n) => Number.isInteger(n) && n >= 1) ? numbers : undefined
}
