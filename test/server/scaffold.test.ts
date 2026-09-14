import { describe, expect, test } from 'bun:test'

import packageJson from '../../package.json'

describe('application scaffold', () => {
  test('defines one Bun development, build, and start surface', () => {
    expect(packageJson.scripts.dev).toBe('bun --hot src/server/index.ts')
    expect(packageJson.scripts.build).toBe('bun build --target=bun src/server/index.ts --outdir dist')
    expect(packageJson.scripts.start).toBe('cd dist && bun index.js')
  })

  test('ships one accessible HTML entry', async () => {
    const file = Bun.file(new URL('../../src/web/index.html', import.meta.url))

    expect(await file.exists()).toBe(true)
    const html = await file.text()
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<main id="app"')
    expect(html).toContain('src="./app.ts"')
    expect(html).toContain('href="./styles.css"')
  })
})
