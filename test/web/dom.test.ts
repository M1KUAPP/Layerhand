import { describe, expect, test } from 'bun:test'

const htmlFile = Bun.file(new URL('../../src/web/index.html', import.meta.url))
const cssFile = Bun.file(new URL('../../src/web/styles.css', import.meta.url))
const cssSource = async () =>
  (
    await Promise.all(
      [
        'styles.css',
        'landing/tokens.css',
        'landing/shell.css',
        'landing/hero.css',
        'landing/steps.css',
        'landing/switcher.css',
        'landing/drawer.css',
        'landing/glass.css',
        'landing/faq.css',
        'landing/waitlist.css',
        'landing/reveal.css',
        'landing/pointer.css',
        'landing/stack.css'
      ].map((name) => Bun.file(new URL(`../../src/web/${name}`, import.meta.url)).text())
    )
  ).join('\n')
const appSource = async () =>
  (
    await Promise.all(
      [
        'app.ts',
        'landing/index.ts',
        'landing/hero.ts',
        'landing/steps.ts',
        'landing/switcher.ts',
        'landing/drawer.ts',
        'landing/glass.ts',
        'landing/faq.ts',
        'landing/waitlist.ts',
        'landing/reveal.ts',
        'landing/pointer.ts',
        'landing/stack.ts'
      ].map((name) => Bun.file(new URL(`../../src/web/${name}`, import.meta.url)).text())
    )
  ).join('\n')
const landingFile = (name: string) => Bun.file(new URL(`../../src/web/landing/${name}`, import.meta.url))

describe('Layerhand workbench markup', () => {
  test('keeps the application root outside live regions and a desktop boundary', async () => {
    const html = await htmlFile.text()

    expect(html).toContain('<main id="app"')
    expect(html).not.toContain('aria-live')
    expect(html).toContain('id="desktop-required"')
    expect(html).toContain('This workbench requires a desktop at least 1280 pixels wide.')
    expect(html).toContain('rel="icon"')
    expect(html).toContain('./assets/favicon.svg')
    expect(html).not.toMatch(/[—–]/)
  })

  test('renders every launch control without assigning untrusted HTML', async () => {
    const app = await appSource()

    expect(app).toContain("input.type = 'file'")
    expect(app).toContain("input.accept = 'image/jpeg,image/png,.jpg,.jpeg,.png'")
    expect(app).toContain("dropZone.addEventListener('drop'")
    expect(app).toContain('Choose a JPEG or PNG image.')
    expect(app).toContain('Only JPEG and PNG images are supported.')
    expect(app).toContain('Image exceeds the 20 MB limit.')
    expect(app).toContain("'Remove the background and keep the product shadow.'")
    expect(app).toContain("'Clean the reflections without changing the label.'")
    expect(app).toContain("'Warm the highlights and keep the background neutral.'")
    expect(app).toContain("sample.dataset.action = 'sample'")
    expect(app).toContain("keyInput.type = 'password'")
    expect(app).toContain("keyInput.autocomplete = 'off'")
    expect(app).toContain('instruction.value = draftInstruction')
    expect(app).toContain('keyInput.value = draftApiKey')
    const hero = await landingFile('hero.ts').text()
    expect(hero).toContain('video.autoplay = true')
    expect(hero).toContain('video.muted = true')
    expect(hero).toContain('video.loop = true')
    const waitlist = await landingFile('waitlist.ts').text()
    expect(waitlist).toContain("form.dataset.form = 'waitlist'")
    expect(app).toContain("correction.dataset.form = 'correction'")
    expect(app).toContain("root.dataset.view === 'running' && state.view === 'running'")
    expect(app).toContain('updateRunning(state)')
    expect(app).toContain("download.download = 'layerhand-result.psd'")
    expect(app).toContain('The server could not be reached. Check your connection and try again.')
    expect(app).toContain("submit.textContent = 'Starting…'")
    expect(app).toContain('instruction-count')
    expect(app).toContain('Used for this run only and never stored.')
    expect(app).toContain('Step ${progress.steps} of')
    expect(app).toContain("'rail-title', 'Run status'")
    expect(app).toContain("'Spend'")
    expect(app).toContain('For example: keep the label unchanged')
    expect(app).toContain('It does not restart the run.')
    expect(app).toContain('Download flattened PNG')
    expect(app).toContain('Download links expire after one hour.')
    expect(app).toContain('layer-hidden')
    expect(app).toContain('The retouching run stopped.')
    expect(app.indexOf("image.className = 'result-preview'")).toBeLessThan(
      app.indexOf("layers.className = 'layer-list'")
    )
    expect(app).not.toContain('innerHTML')
    expect(app).not.toMatch(/[—–]/)
  })

  test('warms the editor as soon as a photograph is chosen, and starts the run on it', async () => {
    const app = await appSource()

    // The warm upload goes as soon as the file passes the checks, not on submit.
    expect(app).toContain('warmEditor(file)')
    expect(app).toContain('.warmUpload(body)')
    expect(app.indexOf('warmEditor(file)')).toBeLessThan(app.indexOf("body.set('instruction'"))
    expect(app).toContain("body.set('uploadId', warmUploadId)")
    // The live view says what is happening until the first frame arrives.
    expect(app).toContain('Preparing the editor…')
  })

  test('states the 24-hour upload deletion beside the drop zone and on the landing page', async () => {
    const app = await Bun.file(new URL('../../src/web/app.ts', import.meta.url)).text()
    const hero = await Bun.file(new URL('../../src/web/landing/hero.ts', import.meta.url)).text()

    // The hero states it among its three facts, which renderHero lists.
    expect(hero).toContain("'Uploads deleted within 24 hours'")
    expect(hero.indexOf('FACTS')).toBeLessThan(hero.indexOf('function renderHero'))

    const occurrences = [...app.matchAll(/Uploads are deleted within 24 hours\./g)].map((match) => match.index)
    expect(occurrences).toHaveLength(1)
    const fileFieldStart = app.indexOf("const fileField = node('fieldset'")
    const fileFieldEnd = app.indexOf("const instructionLabel = node('label'")
    expect(occurrences.some((index) => index > fileFieldStart && index < fileFieldEnd)).toBe(true)
  })

  test('uses the approved visual tokens, hard geometry, and restrained motion', async () => {
    const css = await cssSource()

    expect(css).toContain('--ink: #11110f')
    expect(css).toContain('--paper: #f3f0e8')
    expect(css).toContain('--mark-muted: #9d9b94')
    expect(css).toContain('--accent: #c7ff4a')
    expect(css).toContain('@media (max-width: 1279px)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    // Gradient functions draw four things only, all named in DESIGN.md: the
    // hero's hairline grid and its pointer spotlight, the layer switcher's
    // illustration, and the workbench's sketchboard dots.
    const switcher = await landingFile('switcher.css').text()
    const drawn = /[^{}]*(\.hero-shell|\.workbench-board)[^{}]*\{[^}]*\}/g
    expect(css.replace(switcher, '').replace(drawn, '')).not.toContain('gradient')
    // Glass is a fill and a blur together, and the blur is one token.
    for (const filter of css.matchAll(/backdrop-filter:\s*([^;]+);/g)) expect(filter[1]).toBe('var(--glass-blur)')
    expect(css).not.toContain('border-radius')
    // The landing's motion vocabulary exceeds 180 ms by design; the cap
    // stays on the workbench shell.
    const shell = await cssFile.text()
    for (const duration of shell.matchAll(/(\d+)ms/g)) expect(Number(duration[1])).toBeLessThanOrEqual(180)
  })
})
