import { expect, test } from 'bun:test'

const installFile = Bun.file(new URL('../../../src/web/landing/install.ts', import.meta.url))
const landingFile = Bun.file(new URL('../../../src/web/landing/index.ts', import.meta.url))

test('the landing still has an agent install section after the waitlist', async () => {
  const landing = await landingFile.text()

  expect(landing).toContain("import { renderInstall } from './install'")
  expect(landing).toMatch(/renderWaitlist\(context\),\s*renderInstall\(\)/)
})

test('the install section points at the dedicated MCP page instead of coming soon', async () => {
  const install = await installFile.text()

  expect(install).toContain('/mcp')
  expect(install).not.toContain('Coming soon')
})

test('the landing nav keeps FAQ then MCP then Updates', async () => {
  const landing = await landingFile.text()
  const faq = landing.indexOf("{ href: '#faq', label: 'FAQ' }")
  const mcp = landing.indexOf("{ href: '/mcp', label: 'MCP' }")
  const updates = landing.indexOf("{ href: '#updates', label: 'Updates' }")

  expect(faq).toBeGreaterThan(-1)
  expect(mcp).toBeGreaterThan(faq)
  expect(updates).toBeGreaterThan(mcp)
})
