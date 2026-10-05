// Exports the README architecture diagram in the Layerhand design system.
//
// Archify (https://github.com/tt-a1i/archify) renders docs/readme/architecture.json into a standalone
// HTML viewer. This script restyles that viewer with the src/web/landing/tokens.css colours and the
// bundled fonts, then saves the viewer's own SVG export once per colour scheme.
//
// Re-run from the repository root (archify 2.17; deliver needs meta.output, so pass a temp copy):
//   jq '.meta.output = "architecture.html"' docs/readme/architecture.json > /tmp/architecture.json
//   node <archify>/bin/archify.mjs deliver architecture /tmp/architecture.json /tmp/architecture.html --quality showcase
//   node docs/readme/export-architecture.mjs /tmp/architecture.html .
//
// Writes docs/readme/architecture-light.svg and architecture-dark.svg. Needs playwright-core's Chromium.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const [input, repo] = process.argv.slice(2)
const require = createRequire(path.join(repo, 'package.json'))
const { chromium } = require('playwright-core')
const fonts = path.join(repo, 'src/web/assets/fonts')
const b64 = (f) => fs.readFileSync(path.join(fonts, f)).toString('base64')

// src/web/landing/tokens.css, light (:root) and dark (prefers-color-scheme: dark).
const THEMES = {
  light: {
    '--bg': '#F3F0E8', // --paper
    '--mask': '#F3F0E8', // --paper
    '--grid': '#CFCCC3', // --rule
    '--text': '#11110F', // --ink
    '--text-muted': '#4E4D49', // --color-text-secondary
    '--text-dim': '#5F5E59', // --color-text-tertiary
    '--text-faint': '#5F5E59',
    '--panel': '#FBFAF6', // --color-bg-field
    '--panel-border': '#CFCCC3',
    '--lane-fill': '#E9E5DA', // --color-bg-subtle
    '--lane-stroke': '#CFCCC3',
    '--arrow': '#5F5E59',
    '--arrow-emphasis': '#11110F', // accent fails contrast on paper, so ink
    '--frontend-fill': '#C7FF4A', // --accent
    '--frontend-stroke': '#11110F', // --color-border-strong
    '--backend-fill': '#FBFAF6',
    '--backend-stroke': '#11110F',
    '--database-fill': '#FBFAF6',
    '--database-stroke': '#11110F',
    '--cloud-fill': '#C7FF4A',
    '--cloud-stroke': '#11110F',
    '--security-fill': '#FBFAF6',
    '--security-stroke': '#11110F',
    '--messagebus-fill': '#FBFAF6',
    '--messagebus-stroke': '#11110F',
    '--external-fill': '#E9E5DA',
    '--external-stroke': '#11110F',
    '--region-fill': '#E9E5DA'
  },
  dark: {
    '--bg': '#11110F',
    '--mask': '#11110F',
    '--grid': '#3D3C38',
    '--text': '#F3F0E8',
    '--text-muted': '#B6B3AA',
    '--text-dim': '#9D9B94',
    '--text-faint': '#9D9B94',
    '--panel': '#181815',
    '--panel-border': '#3D3C38',
    '--lane-fill': '#1C1C19',
    '--lane-stroke': '#3D3C38',
    '--arrow': '#9D9B94',
    '--arrow-emphasis': '#C7FF4A',
    '--frontend-fill': '#C7FF4A',
    '--frontend-stroke': '#F3F0E8',
    '--backend-fill': '#181815',
    '--backend-stroke': '#F3F0E8',
    '--database-fill': '#181815',
    '--database-stroke': '#F3F0E8',
    '--cloud-fill': '#C7FF4A',
    '--cloud-stroke': '#F3F0E8',
    '--security-fill': '#181815',
    '--security-stroke': '#F3F0E8',
    '--messagebus-fill': '#181815',
    '--messagebus-stroke': '#F3F0E8',
    '--external-fill': '#1C1C19',
    '--external-stroke': '#F3F0E8',
    '--region-fill': '#1C1C19'
  }
}
const decl = (v) =>
  Object.entries(v)
    .map(([k, x]) => `${k}: ${x};`)
    .join(' ')
const tokenCss = [
  `:root, [data-theme="dark"] { ${decl(THEMES.dark)} }`,
  `[data-theme="light"] { ${decl(THEMES.light)} }`,
  'svg .c-region { fill: var(--region-fill); stroke-dasharray: 9 4; }',
  // Text on the accent fill is ink in both modes, as on the site's accent buttons.
  'svg [data-node-kind="frontend"] .t-primary, svg [data-node-kind="cloud"] .t-primary { fill: #11110F; }',
  'svg [data-node-kind="frontend"] .t-muted, svg [data-node-kind="cloud"] .t-muted { fill: #4E4D49; }',
  'svg .s-frontend, svg .s-cloud { color: #11110F; }',
  "svg, svg text { font-family: 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }"
].join('\n')
const geist = `
@font-face { font-family: 'Geist'; font-style: normal; font-weight: 100 549; font-display: block;
  src: url(data:font/woff2;base64,${b64('geist-v5-latin-regular.woff2')}) format('woff2'); }
@font-face { font-family: 'Geist'; font-style: normal; font-weight: 550 900; font-display: block;
  src: url(data:font/woff2;base64,${b64('geist-v5-latin-600.woff2')}) format('woff2'); }
`

let html = fs.readFileSync(input, 'utf8')
const open = html.indexOf('<style id="archify-fonts">')
const close = html.indexOf('</style>', open)
if (open < 0 || close < 0) throw new Error('no #archify-fonts')
html = html.slice(0, close) + geist + html.slice(close)
html = html.replace('</head>', `<style id="layerhand-tokens">\n${tokenCss}\n</style>\n</head>`)
const styled = path.join(path.dirname(input), 'styled.html')
fs.writeFileSync(styled, html)

const out = path.join(repo, 'docs/readme')
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const ctx = await browser.newContext({
    colorScheme: 'light',
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 }
  })
  const page = await ctx.newPage()
  await page.goto(`file://${styled}`)
  await page.evaluate(() => document.fonts.ready)
  await page.click('#btn-export')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-format="svg"]')])
  const svg = fs.readFileSync(await dl.path(), 'utf8')
  await ctx.close()
  for (const scheme of ['light', 'dark']) {
    // The export is dual-theme; svg[data-theme] pins one theme regardless of the host.
    const locked = svg.replace(/<svg\b/, `<svg data-theme="${scheme}"`)
    if (locked === svg) throw new Error('no <svg> root')
    fs.writeFileSync(
      path.join(out, `architecture-${scheme}.svg`),
      locked.replace(/[ \t]+$/gm, '').replace(/\n*$/, '\n')
    )
    console.log(`wrote architecture-${scheme}.svg (${Math.round(locked.length / 1024)} KB)`)
  }
} finally {
  await browser.close()
}
