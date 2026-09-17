import { renderDrawer } from './drawer'
import { renderGlass } from './glass'
import { renderHero } from './hero'
import { renderScrub } from './scrub'
import { renderWaitlist } from './waitlist'

export interface LandingContext {
  /** Moves the page into the workbench. The primary call to action. */
  startRun(): void
  joinWaitlist(email: string): Promise<{ created: boolean }>
  /** Turns a thrown error into a sentence safe to show. */
  publicMessage(error: unknown): string
  brandHeader(): HTMLElement
}

// Mirrors --duration-enter + 5 x --stagger-block in tokens.css.
const ENTER_SETTLE_MS = 700 + 5 * 100
// The fonts should never take this long; if they do, enter anyway.
const ENTER_FONT_TIMEOUT_MS = 1200

function startEntranceGate(): void {
  const root = document.documentElement
  root.dataset.enter = 'pending'
  let started = false
  const run = () => {
    if (started) return
    started = true
    root.dataset.enter = 'run'
    window.setTimeout(() => {
      root.dataset.enter = 'done'
    }, ENTER_SETTLE_MS)
  }
  void document.fonts.ready.then(() => {
    requestAnimationFrame(() => requestAnimationFrame(run))
  })
  window.setTimeout(run, ENTER_FONT_TIMEOUT_MS)
}

const ICON_FONT_URL = 'https://use.hugeicons.com/font/icons.css'

// Appended after parse so a slow CDN never blocks first paint.
export function loadIconFont(): void {
  if (document.querySelector(`link[href="${ICON_FONT_URL}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = ICON_FONT_URL
  document.head.append(link)
}

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#layers', label: 'The layers' },
  { href: '#real-run', label: 'A real run' },
  { href: '#updates', label: 'Updates' }
]

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag)
  result.className = className
  if (text !== undefined) result.textContent = text
  return result
}

// The bar's own way into the product. Its name differs from the hero's
// Retouch a photo so the two never read as one control twice.
function renderNav(context: LandingContext): HTMLElement {
  const nav = node('nav', 'site-nav')
  nav.setAttribute('aria-label', 'Primary')
  const links = node('ul', 'site-nav__links')
  for (const item of NAV) {
    const entry = node('li', 'site-nav__item')
    const link = node('a', 'site-nav__link', item.label)
    link.href = item.href
    entry.append(link)
    links.append(entry)
  }
  const start = node('button', 'site-nav__cta', 'Try it free')
  start.type = 'button'
  const arrow = node('i', 'hgi-stroke hgi-arrow-right-01')
  arrow.setAttribute('aria-hidden', 'true')
  start.append(arrow)
  start.addEventListener('click', () => context.startRun())
  nav.append(links, start)
  return nav
}

export function renderLanding(context: LandingContext): DocumentFragment {
  loadIconFont()
  startEntranceGate()
  const fragment = document.createDocumentFragment()

  const header = context.brandHeader()
  header.dataset.over = 'hero'
  header.append(renderNav(context))

  const sections = [header, renderHero(context), renderScrub(), renderDrawer(), renderGlass(), renderWaitlist(context)]
  for (const section of sections) fragment.append(section)
  return fragment
}
