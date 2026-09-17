export function linearProgress(elapsedMs, durationMs) {
  if (durationMs <= 0) return 1
  return Math.min(1, Math.max(0, elapsedMs / durationMs))
}

export function scrollDuration(distancePx, { pixelsPerSecond = 900, minMs = 500, maxMs = 1400 } = {}) {
  if (distancePx === 0) return 0
  const duration = (Math.abs(distancePx) / pixelsPerSecond) * 1000
  return Math.min(maxMs, Math.max(minMs, Math.round(duration)))
}

export function scrollTarget(
  { elementTop, elementHeight, viewportHeight, scrollY, documentHeight },
  { viewportRatio = 0.18, headerOffset = 88 } = {}
) {
  const topClearance = Math.max(headerOffset, (viewportHeight - elementHeight) * viewportRatio)
  const target = Math.max(0, scrollY + elementTop - topClearance)
  const maxScroll = documentHeight == null ? target : Math.max(0, documentHeight - viewportHeight)
  return Math.round(Math.min(target, maxScroll))
}

export async function smoothScrollTo(page, locator, options = {}) {
  const metrics = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      elementTop: rect.top,
      elementHeight: rect.height,
      viewportHeight: window.innerHeight,
      scrollY: window.scrollY,
      documentHeight: document.documentElement.scrollHeight
    }
  })
  const targetY = scrollTarget(metrics, options)
  const durationMs = scrollDuration(targetY - metrics.scrollY, options)
  if (durationMs === 0) return { targetY, durationMs }

  await page.evaluate(
    async ({ destination, duration }) => {
      const properties = ['scroll-behavior', 'scroll-snap-type']
      const surfaces = [document.documentElement, document.body].filter(Boolean)
      const saved = surfaces.map((element) => ({
        element,
        values: properties.map((name) => ({
          name,
          value: element.style.getPropertyValue(name),
          priority: element.style.getPropertyPriority(name)
        }))
      }))
      for (const { element } of saved) {
        element.style.setProperty('scroll-behavior', 'auto', 'important')
        element.style.setProperty('scroll-snap-type', 'none', 'important')
      }

      const startY = window.scrollY
      const distance = destination - startY
      const started = performance.now()
      try {
        await new Promise((resolve) => {
          const step = (now) => {
            const progress = Math.min(1, Math.max(0, (now - started) / duration))
            window.scrollTo(0, startY + distance * progress)
            if (progress < 1) requestAnimationFrame(step)
            else resolve()
          }
          requestAnimationFrame(step)
        })
        // Make the beat authoritative even if a browser rounded an intermediate
        // frame. CSS easing is still suspended at this point.
        window.scrollTo(0, destination)
        if (Math.abs(window.scrollY - destination) > 2) {
          throw new Error(`viewport stopped at ${window.scrollY}, expected ${destination}`)
        }
      } finally {
        for (const { element, values } of saved) {
          for (const { name, value, priority } of values) {
            if (value) element.style.setProperty(name, value, priority)
            else element.style.removeProperty(name)
          }
        }
      }
    },
    { destination: targetY, duration: durationMs }
  )
  return { targetY, durationMs }
}
