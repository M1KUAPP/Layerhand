import { describe, expect, test } from 'bun:test'

// -------------------------------------------------------------------------- //
// Helpers
// -------------------------------------------------------------------------- //

type FileText = { path: string; text: string }

/** List every file under src/web/landing/ with the given extensions. */
async function collectLandingFiles(patterns: { ext: '.css' | '.ts'; baseDir: string }[]): Promise<FileText[]> {
  const { ext, baseDir } = patterns[0]!
  const { ext: ext2, baseDir: baseDir2 } = patterns[1] ?? patterns[0]!
  const [first, second] = await Promise.all([
    Array.fromAsync(new Bun.Glob(`${ext}`).scan({ cwd: baseDir })),
    ext2 !== ext ? Array.fromAsync(new Bun.Glob(`${ext2}`).scan({ cwd: baseDir2 })) : []
  ])
  const relative = (abs: string) => abs.replace(`${baseDir}/`, '')
  const make = async (p: string) => ({
    path: relative(p),
    text: await Bun.file(p).text()
  })
  const all = [...first, ...second]
  return Promise.all(all.map(make))
}

const cssFiles = () => collectLandingFiles([{ ext: '.css', baseDir: 'src/web/landing' }])

const tsFiles = () => collectLandingFiles([{ ext: '.ts', baseDir: 'src/web/landing' }])

// -------------------------------------------------------------------------- //
// Rule 1: no muted text colour
// -------------------------------------------------------------------------- //

describe('landing design audit: no muted text', () => {
  test('no .css uses color: var(--mark-muted) or #9d9b94', async () => {
    const files = await cssFiles()
    const offending: string[] = []
    for (const { path, text } of files) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        // Skip fill / stroke / border / background uses – only colour: is text
        const trimmed = line.trim()
        if (
          trimmed.startsWith('fill:') ||
          trimmed.startsWith('stroke:') ||
          trimmed.startsWith('border:') ||
          trimmed.startsWith('background:')
        )
          continue
        const l = line.toLowerCase()
        if (l.includes('color:') && (l.includes('var(--mark-muted)') || l.includes('#9d9b94'))) {
          offending.push(`${path}:${i + 1}: ${line.trim()}`)
        }
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})

// -------------------------------------------------------------------------- //
// Rule 2: no raw colours outside tokens.css
// -------------------------------------------------------------------------- //

describe('landing design audit: no raw colours', () => {
  test('no .css or .ts under landing/ (except tokens.css) contains raw colours', async () => {
    const css = await cssFiles()
    const ts = await tsFiles()
    const hexRe = /#[0-9a-fA-F]{3}(?![0-9a-fA-F\n])/g
    const hexRe6 = /#[0-9a-fA-F]{6}(?![0-9a-fA-F\n])/g
    const rawFnRe = /\b(rgb|rgba|hsl|oklch)\s*\(/g
    const offending: string[] = []

    const check = ({ path, text }: FileText) => {
      if (path === 'tokens.css') return
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        // Skip @font-face src: url() – those are file paths, not colours
        if (line.trim().startsWith('src:')) continue
        const matches = [...line.matchAll(hexRe), ...line.matchAll(hexRe6), ...line.matchAll(rawFnRe)]
        for (const m of matches) {
          // Allow CSS-valid comment-like sequences or url() fragments
          const before = line.slice(0, m.index!)
          if (before.includes('url(')) continue
          offending.push(`${path}:${i + 1}: ${line.trim()}`)
          break
        }
      }
    }

    for (const f of [...css, ...ts]) check(f)
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})

// -------------------------------------------------------------------------- //
// Rule 3: one icon library
// -------------------------------------------------------------------------- //

describe('landing design audit: one icon library', () => {
  test('no .ts creates an svg element or contains <svg except glass.ts which inlines layers.svg', async () => {
    const files = await tsFiles()
    const offending: string[] = []
    for (const { path, text } of files) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (path === 'glass.ts') continue
        if (line.includes('document.createElement("svg') || line.includes('<svg')) {
          offending.push(`${path}:${i + 1}: ${line.trim()}`)
        }
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })

  test('every hgi- class is accompanied by hgi-stroke on the same element string', async () => {
    const files = await tsFiles()
    const offending: string[] = []
    for (const { path, text } of files) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (!line.includes('hgi-')) continue
        const hgiMatch = line.match(/class(Name)?\s*=\s*['"]([^'"]+)['"]/)
        if (!hgiMatch) continue
        const classes = (hgiMatch[2] ?? '').split(/\s+/)
        const hasHgi = classes.some((c) => c.startsWith('hgi-'))
        const hasStroke = classes.some((c) => c === 'hgi-stroke')
        if (hasHgi && !hasStroke) {
          offending.push(`${path}:${i + 1}: ${line.trim()}`)
        }
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})

// -------------------------------------------------------------------------- //
// Rule 4: one typeface pairing
// -------------------------------------------------------------------------- //

describe('landing design audit: one typeface pairing', () => {
  test('no font-family in landing/*.css names anything other than --font-display, --font-ui, or generic fallbacks', async () => {
    const files = await cssFiles()
    const allowed = new Set([
      '--font-display',
      '--font-ui',
      'serif',
      'sans-serif',
      'Arial',
      'Helvetica',
      'Georgia',
      'Times New Roman'
    ])
    const fontFamilyRe = /font-family:\s*([^;]+);/gi
    const offending: string[] = []
    for (const { path, text } of files) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        for (const match of [...line.matchAll(fontFamilyRe)]) {
          const decl = (match[1] ?? '').trim()
          const names = decl.split(',').map((s) => s.trim())
          for (const name of names) {
            if (!allowed.has(name)) {
              offending.push(`${path}:${i + 1}: ${line.trim()}`)
              break
            }
          }
        }
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})

// -------------------------------------------------------------------------- //
// Rule 5: reduced motion everywhere
// -------------------------------------------------------------------------- //

describe('landing design audit: reduced motion everywhere', () => {
  test('every landing/*.css except tokens.css contains @media (prefers-reduced-motion: reduce)', async () => {
    const files = await cssFiles()
    const offending: string[] = []
    for (const { path, text } of files) {
      if (path === 'tokens.css') continue
      if (!text.includes('@media (prefers-reduced-motion: reduce)')) {
        offending.push(path)
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})

// -------------------------------------------------------------------------- //
// Rule 6: compositor only
// -------------------------------------------------------------------------- //

describe('landing design audit: compositor only', () => {
  test('no landing/*.css transitions or animates box-model properties', async () => {
    const files = await cssFiles()
    const boxProps = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding']
    const offending: string[] = []

    const checkProp = (prop: string, path: string, i: number, line: string) => {
      const re = new RegExp(`(^|,\\s*|\\s+)${prop}($|\\s|,|;|!)`, 'i')
      if (re.test(line)) offending.push(`${path}:${i + 1}: ${line.trim()}`)
    }

    const boxRe = /\b(width|height|top|left|right|bottom|margin|padding)\b/g

    for (const { path, text } of files) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''

        // transition: <values>
        if (line.match(/^\s*transition:/i)) {
          const val = line.replace(/^\s*transition:\s*/i, '').trim()
          if (val !== 'none') {
            const props = val
              .replace(/^[^ ]+ \d+ms.*/, '')
              .trim()
              .split(/\s+/)
            for (const p of props) {
              if (boxProps.includes(p)) {
                offending.push(`${path}:${i + 1}: ${line.trim()}`)
                break
              }
            }
            // Also check raw value
            const rawProps = val.match(/\b(width|height|top|left|right|bottom|margin|padding)\b/g)
            if (rawProps?.length) {
              offending.push(`${path}:${i + 1}: ${line.trim()}`)
              break
            }
          }
        }

        // transition-property: <values>
        if (line.match(/^\s*transition-property:/i)) {
          const val = line.replace(/^\s*transition-property:\s*/i, '').trim()
          if (val !== 'none') {
            const props = val.split(/,\s*/).map((s) => s.trim())
            for (const p of props) {
              if (boxProps.includes(p)) {
                offending.push(`${path}:${i + 1}: ${line.trim()}`)
                break
              }
            }
          }
        }

        // @keyframes – check transform values inside keyframe blocks
        if (line.includes('@keyframes')) {
          // Collect the whole block
          const blockLines = [line]
          for (let j = i + 1; j < lines.length; j++) {
            blockLines.push(lines[j] ?? '')
            if ((lines[j] ?? '').includes('{')) break
          }
          for (const bl of blockLines) {
            for (const prop of boxProps) {
              if (bl.match(new RegExp(`(^|,\\s*|\\s+)${prop}\\s*:`))) {
                offending.push(`${path}:${i + 1}: ${line.trim()}`)
                break
              }
            }
          }
        }
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})

// -------------------------------------------------------------------------- //
// Rule 7: no CSS glass
// -------------------------------------------------------------------------- //

describe('landing design audit: no CSS glass', () => {
  test('no .css under landing/ uses backdrop-filter', async () => {
    const files = await cssFiles()
    const offending: string[] = []
    for (const { path, text } of files) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (line.includes('backdrop-filter')) {
          offending.push(`${path}:${i + 1}: ${line.trim()}`)
        }
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})

// -------------------------------------------------------------------------- //
// Rule 8: no dashes in copy
// -------------------------------------------------------------------------- //

describe('landing design audit: no dashes in copy', () => {
  test('no .ts under landing/ contains an em dash or en dash character', async () => {
    const files = await tsFiles()
    const emDash = '—'
    const enDash = '–'
    const offending: string[] = []
    for (const { path, text } of files) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (line.includes(emDash) || line.includes(enDash)) {
          offending.push(`${path}:${i + 1}: ${line.trim()}`)
        }
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})

// -------------------------------------------------------------------------- //
// Rule 9: square corners
// -------------------------------------------------------------------------- //

describe('landing design audit: square corners', () => {
  test('no border-radius in landing/*.css has a value other than 0, 50% or 999px', async () => {
    const files = await cssFiles()
    const borderRadiusRe = /border-radius:\s*([^;]+);/gi
    const offending: string[] = []
    for (const { path, text } of files) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        for (const match of [...line.matchAll(borderRadiusRe)]) {
          const val = (match[1] ?? '').trim()
          if (val !== '0' && val !== '50%' && val !== '999px') {
            offending.push(`${path}:${i + 1}: ${line.trim()}`)
          }
        }
      }
    }
    expect(offending).toHaveLength(0)
    if (offending.length > 0) expect(offending).toEqual([])
  })
})
