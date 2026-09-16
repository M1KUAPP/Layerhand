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

export function renderLanding(context: LandingContext): DocumentFragment {
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
