export const REQUIRED_BEATS = ['landing', 'input', 'running', 'correction', 'applied', 'result', 'layers', 'end']

export function auditCapture(beats, filmed) {
  const observed = beats.map(({ name }) => name)
  const missing = REQUIRED_BEATS.filter((name) => filmed[name] !== 1 || !observed.includes(name))
  const ordered =
    observed.length === REQUIRED_BEATS.length && observed.every((name, index) => name === REQUIRED_BEATS[index])
  return { complete: missing.length === 0 && ordered, missing, observed, ordered }
}
