import { describe, expect, test } from 'bun:test'

const htmlFile = Bun.file(new URL('../../src/web/index.html', import.meta.url))
const appFile = Bun.file(new URL('../../src/web/app.ts', import.meta.url))
const cssFile = Bun.file(new URL('../../src/web/styles.css', import.meta.url))

describe('Layerhand workbench markup', () => {
  test('keeps one accessible live application root and a desktop boundary', async () => {
    const html = await htmlFile.text()

    expect(html).toContain('<main id="app"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('id="desktop-required"')
    expect(html).toContain('This workbench requires a desktop at least 1280 pixels wide.')
    expect(html).not.toMatch(/[—–]/)
  })

  test('renders every launch control without assigning untrusted HTML', async () => {
    const app = await appFile.text()

    expect(app).toContain("input.type = 'file'")
    expect(app).toContain("input.accept = 'image/jpeg,image/png,.jpg,.jpeg,.png'")
    expect(app).toContain("dropZone.addEventListener('drop'")
    expect(app).toContain('Choose a JPEG or PNG image.')
    expect(app).toContain('The upload exceeds the 20 MB limit.')
    expect(app).toContain("'Remove the background and keep the product shadow.'")
    expect(app).toContain("'Clean the reflections without changing the label.'")
    expect(app).toContain("'Warm the highlights and keep the background neutral.'")
    expect(app).toContain("sample.dataset.action = 'sample'")
    expect(app).toContain("keyInput.type = 'password'")
    expect(app).toContain("keyInput.autocomplete = 'off'")
    expect(app).toContain('instruction.value = draftInstruction')
    expect(app).toContain('keyInput.value = draftApiKey')
    expect(app).toContain('video.autoplay = true')
    expect(app).toContain('video.muted = true')
    expect(app).toContain('video.loop = true')
    expect(app).toContain("form.dataset.form = 'waitlist'")
    expect(app).toContain("correction.dataset.form = 'correction'")
    expect(app).toContain("root.dataset.view === 'running' && state.view === 'running'")
    expect(app).toContain('updateRunning(state)')
    expect(app).toContain("download.download = 'layerhand-result.psd'")
    expect(app.indexOf("image.className = 'result-preview'")).toBeLessThan(
      app.indexOf("layers.className = 'layer-list'")
    )
    expect(app).not.toContain('innerHTML')
    expect(app).not.toMatch(/[—–]/)
  })

  test('uses the approved visual tokens, hard geometry, and restrained motion', async () => {
    const css = await cssFile.text()

    expect(css).toContain('--ink: #11110f')
    expect(css).toContain('--paper: #f3f0e8')
    expect(css).toContain('--muted: #9d9b94')
    expect(css).toContain('--accent: #c7ff4a')
    expect(css).toContain('@media (max-width: 1279px)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).not.toContain('gradient')
    expect(css).not.toContain('border-radius')
    for (const duration of css.matchAll(/(\d+)ms/g)) expect(Number(duration[1])).toBeLessThanOrEqual(180)
  })
})
