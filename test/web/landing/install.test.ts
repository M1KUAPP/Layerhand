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

test('the landing nav is How it works, MCP, Updates, and Try it free', async () => {
  const landing = await landingFile.text()
  const how = landing.indexOf("{ href: '#how-it-works', label: 'How it works' }")
  const mcp = landing.indexOf("{ href: '/mcp', label: 'MCP' }")
  const updates = landing.indexOf("{ href: '#updates', label: 'Updates' }")

  expect(how).toBeGreaterThan(-1)
  expect(mcp).toBeGreaterThan(how)
  expect(updates).toBeGreaterThan(mcp)
  expect(landing).not.toContain("{ href: '#layers'")
  expect(landing).not.toContain("{ href: '#real-run'")
  expect(landing).not.toContain("{ href: '#faq'")
  expect(landing).toContain("'Try it free'")
})
