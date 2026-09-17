import { loadIconFont } from './landing/index'

// One scroll position drives two pieces of page chrome. The landing's bar
// is clear over the hero and takes the paper once the page moves, and Back
// to top shows once the first screen is behind. Both states live on the
// root, so a view that renders a new header picks them up without binding
// anything of its own.
const root = document.documentElement
const toTop = document.querySelector<HTMLButtonElement>('#to-top')
let scheduled = false

function update(): void {
  scheduled = false
  root.dataset.scrolled = String(window.scrollY > 24)
  const far = window.scrollY > window.innerHeight
  root.dataset.far = String(far)
  if (toTop) {
    // Out of the tab order while it is invisible, or a keyboard user tabs
    // onto a control that is not on screen.
    toTop.tabIndex = far ? 0 : -1
    if (far) toTop.removeAttribute('aria-hidden')
    else toTop.setAttribute('aria-hidden', 'true')
  }
}

window.addEventListener(
  'scroll',
  () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(update)
  },
  { passive: true }
)
update()

if (toTop) {
  // The arrow is an icon font glyph, and a view restored straight into the
  // workbench never rendered the landing that loads the font.
  loadIconFont()
  toTop.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  })
}
