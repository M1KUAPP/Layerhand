import posterUrl from '../assets/landing/scrub-poster.jpg'

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag)
  if (className) result.className = className
  if (text !== undefined) result.textContent = text
  return result
}

export function renderScrub(): HTMLElement {
  const section = node('section', 'scrub')
  section.dataset.section = 'scrub'
  section.setAttribute('aria-labelledby', 'scrub-title')

  const copy = node('div', 'scrub__copy')
  const title = node('h2', 'scrub__title', 'A flat JPEG keeps the result. A PSD keeps the work.')
  title.id = 'scrub-title'
  copy.append(
    node('p', 'scrub__eyebrow', 'Why layers'),
    title,
    node(
      'p',
      'scrub__body',
      'Retouching is a stack of separate decisions, from the photograph at the bottom to the last adjustment on top. Layerhand hands the stack back as it was built, so one decision can change without redoing the rest.'
    )
  )

  const frame = node('div', 'scrub__frame')
  frame.setAttribute('role', 'img')
  frame.setAttribute('aria-label', 'Illustration of a photograph coming apart into separate layers')
  const poster = node('img', 'scrub__poster')
  poster.alt = ''
  poster.src = posterUrl
  frame.append(poster)
  const figure = node('figure', 'scrub__figure')
  figure.append(frame, node('figcaption', 'scrub__caption', 'An illustration. The layers from a real run come next.'))

  const stage = node('div', 'scrub__stage')
  stage.append(copy, figure)
  const track = node('div', 'scrub__track')
  track.append(stage)
  section.append(track)
  return section
}
