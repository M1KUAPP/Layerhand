import { expect, test } from 'bun:test'

const installFile = Bun.file(new URL('../../../src/web/landing/install.ts', import.meta.url))
const landingFile = Bun.file(new URL('../../../src/web/landing/index.ts', import.meta.url))

test('the landing still has an agent install section after the waitlist', async () => {
  const landing = await landingFile.text()

  expect(landing).toContain("import { renderInstall } from './install'")
  expect(landing).toContain('renderWaitlist(context), renderInstall()')
})

test('the install section says coming soon and does not advertise unpublished npm commands', async () => {
  const install = await installFile.text()

  expect(install).toContain('Coming soon')
  expect(install).not.toContain('npx -y layerhand-mcp')
  expect(install).not.toContain('claude plugin marketplace add')
  expect(install).not.toContain('codex mcp add')
})
