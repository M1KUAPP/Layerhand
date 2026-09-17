const TARGETS = [
  '.steps__eyebrow, .steps__title, .steps__body, .steps__card',
  '.switcher__eyebrow, .switcher__title, .switcher__body',
  '.drawer__eyebrow, .drawer__title, .drawer__body, .drawer__stat',
  '.glass__eyebrow, .glass__title, .glass__body, .glass__fact',
  '.faq__eyebrow, .faq__title, .faq__tile',
  '.waitlist__eyebrow, .waitlist__title, .waitlist__body, .waitlist__form'
].join(', ')

export function mountReveal(root: ParentNode): void {
  if (typeof IntersectionObserver === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  document.documentElement.dataset.reveal = 'on'

  const targets = root.querySelectorAll<HTMLElement>(TARGETS)
  const viewportBottom = window.innerHeight

  const observer = new IntersectionObserver(
    (entries, obs) => {
      const entering = entries.filter((entry) => entry.isIntersecting)
      const sectionCounts = new Map<Element | string, number>()

      for (const entry of entering) {
        const target = entry.target as HTMLElement
        const section = target.closest('[data-section]')
        const key = section ?? 'default'
        const index = sectionCounts.get(key) ?? 0
        sectionCounts.set(key, index + 1)

        target.style.setProperty('--reveal-i', String(index))
        target.dataset.reveal = 'in'
        obs.unobserve(target)

        const onTransitionEnd = (event: TransitionEvent) => {
          if (event.propertyName === 'opacity' && event.target === target) {
            target.removeEventListener('transitionend', onTransitionEnd)
            target.dataset.reveal = 'shown'
          }
        }
        target.addEventListener('transitionend', onTransitionEnd)
      }
    },
    { threshold: 0.15 }
  )

  for (const target of targets) {
    const rect = target.getBoundingClientRect()
    if (rect.top < viewportBottom) {
      target.dataset.reveal = 'shown'
    } else {
      target.dataset.reveal = 'pending'
      observer.observe(target)
    }
  }
}
