import { expect, test } from 'bun:test'

const cssFile = Bun.file(new URL('../../../src/web/landing/glass.css', import.meta.url))
const glassFile = Bun.file(new URL('../../../src/web/landing/glass.ts', import.meta.url))

test('the three glass facts share one equal 40px icon column with centered glyphs', async () => {
  const css = await cssFile.text()
  const source = await glassFile.text()

  expect(source.match(/className: 'glass__fact'/g)?.length ?? source.includes("node('li', 'glass__fact')")).toBeTruthy()
  expect(source).toContain("node('i', `glass__fact-icon")
  expect(css).toContain('grid-template-columns: 40px 1fr')
  expect(css).toMatch(/\.glass__fact-icon\s*\{[^}]*width:\s*40px/)
  expect(css).toMatch(/\.glass__fact-icon\s*\{[^}]*height:\s*40px/)
  expect(css).toMatch(/\.glass__fact-icon\s*\{[^}]*place-items:\s*center/)
  expect(css).toMatch(/\.glass__fact-icon::before\s*\{[^}]*display:\s*block/)
})
