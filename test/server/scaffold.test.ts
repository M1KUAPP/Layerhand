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

  test('boots the composed runtime with an HTTP body ceiling and clean shutdown', async () => {
    const index = await Bun.file(new URL('../../src/server/index.ts', import.meta.url)).text()
    const smoke = await Bun.file(new URL('./container-smoke.sh', import.meta.url)).text()

    expect(index).toContain('await createLaunchRuntime')
    expect(index).toContain('maxRequestBodySize: MAX_RUN_REQUEST_BODY_BYTES')
    expect(index).toContain("process.once('SIGTERM', shutdown)")
    expect(smoke).toContain('--env NODE_ENV=development')
  })
})
