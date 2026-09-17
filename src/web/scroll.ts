// The landing's bar is clear over the hero and takes the paper once the
// page moves. The state lives on the root, so a view that renders a new
// header picks it up without binding anything of its own.
const root = document.documentElement
let scheduled = false

function update(): void {
  scheduled = false
  root.dataset.scrolled = String(window.scrollY > 24)
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
