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

export function renderLanding(context: LandingContext): DocumentFragment {
  startEntranceGate()
  const fragment = document.createDocumentFragment()
  const sections = [
    context.brandHeader(),
    renderHero(context),
    renderScrub(),
    renderDrawer(),
    renderGlass(),
    renderWaitlist(context)
  ]
  for (const section of sections) {
    if (section) fragment.append(section)
  }
  return fragment
}
