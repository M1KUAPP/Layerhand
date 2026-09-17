export function mountPointer(shell: HTMLElement): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let rafId = 0
  let pendingX = 0
  let pendingY = 0

  function onPointerMove(event: PointerEvent): void {
    const rect = shell.getBoundingClientRect()
    pendingX = Math.round(event.clientX - rect.left)
    pendingY = Math.round(event.clientY - rect.top)

    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0
        shell.style.setProperty('--spot-x', `${pendingX}px`)
        shell.style.setProperty('--spot-y', `${pendingY}px`)
        shell.dataset.spot = 'on'
      })
    }
  }

  function onPointerLeave(): void {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    delete shell.dataset.spot
  }

  shell.addEventListener('pointermove', onPointerMove)
  shell.addEventListener('pointerleave', onPointerLeave)
}
