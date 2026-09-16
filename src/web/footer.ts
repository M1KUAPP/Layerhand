// The page folds over the footer (styles.css). The page's bottom margin has
// to match the footer's height at every width and zoom, so it is measured.
const footer = document.querySelector<HTMLElement>('#site-footer')

if (footer) {
  const root = document.documentElement
  const reserve = () => root.style.setProperty('--footer-h', `${footer.getBoundingClientRect().height}px`)
  new ResizeObserver(reserve).observe(footer, { box: 'border-box' })
  reserve()
  root.dataset.footer = 'curtain'

  // A footer link reached with the keyboard is still under the page, and
  // scrolling a fixed element into view does nothing, so the page scrolls to
  // its end instead (WCAG 2.4.11).
  footer.addEventListener('focusin', () => window.scrollTo({ top: root.scrollHeight }))
}
