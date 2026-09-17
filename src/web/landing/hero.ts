import samplePhotoUrl from '../assets/sample-photo.png'

import type { LandingContext } from './index'

// Empty until the demo loop is recorded; while it is, the plate shows the
// poster with its caption instead of the video and its toggle.
const LOOP_URL = ''

const TITLE_LINES = [
  ['A', 'layered', 'PSD,'],
  ['not', 'a', 'flat', 'JPEG.']
]

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

function icon(name: string): HTMLElement {
  const result = node('i', `hgi-stroke ${name}`)
  result.setAttribute('aria-hidden', 'true')
  return result
}

function enter<T extends HTMLElement>(element: T, index: number): T {
  element.classList.add('enter')
  element.style.setProperty('--enter-i', String(index))
  return element
}

export function renderHero(context: LandingContext): HTMLElement {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  // landing-grid is the foundation's structural hook for the hero; the
  // section's own styling hangs off .hero.
  const hero = node('section', 'hero landing-grid')
  hero.dataset.section = 'hero'
  hero.setAttribute('aria-labelledby', 'hero-title')

  const copy = node('div', 'hero__copy')
  copy.append(enter(node('p', 'hero__eyebrow', 'AI retouching'), 0))

  const title = node('h1', 'hero__title')
  title.id = 'hero-title'
  title.tabIndex = -1
  let wordIndex = 0
  for (const [lineIndex, words] of TITLE_LINES.entries()) {
    const line = node('span', 'hero__line')
    for (const word of words) {
      if (line.childNodes.length > 0) line.append(' ')
      line.append(enter(node('span', 'hero__word', word), wordIndex * 0.8))
      wordIndex += 1
    }
    // The space between the two lines lives inside the first line so the
    // headline reads as one sentence without an anonymous blank box.
    if (lineIndex === 0) line.append(' ')
    title.append(line)
  }
  copy.append(title)

  copy.append(
    enter(
      node(
        'p',
        'hero__lede',
        'Layerhand retouches your photograph in Photopea while you watch. Correct it as it works, then download a PSD with each edit on its own named layer.'
      ),
      4
    )
  )

  const actions = enter(node('div', 'hero__actions'), 5)
  const cta = node('button', 'hero__cta', 'Retouch a photo')
  cta.type = 'button'
  cta.append(icon('hgi-arrow-right-01'))
  cta.addEventListener('click', () => context.startRun())
  const updates = node('a', 'hero__updates', '')
  updates.href = '#updates'
  const updatesText = node('span', 'hero__updates-text', 'Get launch updates by email')
  updates.append(updatesText, icon('hgi-arrow-down-01'))
  actions.append(
    cta,
    updates,
    node('p', 'hero__note', 'Three free runs. No account needed. Uploads are deleted within 24 hours.')
  )
  copy.append(actions)

  const media = enter(node('div', 'hero__media'), 2)
  const plate = node('figure', 'hero__plate')
  const window_ = node('div', 'hero__window')
  if (LOOP_URL) {
    const video = node('video', 'hero__photo')
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.autoplay = true
    if (reducedMotion.matches) video.autoplay = false
    video.poster = samplePhotoUrl
    video.src = LOOP_URL
    video.setAttribute('aria-label', 'Silent demo of Layerhand retouching a photograph in Photopea')
    const toggle = node('button', 'hero__loop-toggle')
    toggle.type = 'button'
    const toggleIcon = icon('hgi-pause')
    const toggleText = node('span', undefined, 'Pause')
    toggle.append(toggleIcon, toggleText)
    const showToggle = (playing: boolean): void => {
      toggleIcon.className = `hgi-stroke ${playing ? 'hgi-pause' : 'hgi-play'}`
      toggleText.textContent = playing ? 'Pause' : 'Play'
      toggle.setAttribute('aria-label', playing ? 'Pause the demo' : 'Play the demo')
    }
    toggle.addEventListener('click', () => {
      if (video.paused) void video.play()
      else video.pause()
      showToggle(!video.paused)
    })
    showToggle(video.autoplay)
    window_.append(video, toggle)
    plate.append(window_)
  } else {
    const photo = node('img', 'hero__photo')
    photo.src = samplePhotoUrl
    photo.alt =
      'Unretouched studio photograph of a cobalt-blue glass bottle with a brushed-metal cap on a creased paper backdrop.'
    window_.append(photo)
    plate.append(
      window_,
      node(
        'figcaption',
        'hero__caption',
        'Before retouching: the sample photograph, which you can try in the workbench.'
      )
    )
  }
  media.append(plate)

  // One write per frame at most; under reduced motion nothing drifts.
  let scheduled = false
  const drift = (): void => {
    scheduled = false
    const top = hero.getBoundingClientRect().top + window.scrollY
    const progress = Math.min(1, Math.max(0, (window.scrollY - top) / hero.offsetHeight))
    hero.style.setProperty('--hero-progress', String(progress))
  }
  window.addEventListener(
    'scroll',
    () => {
      if (scheduled || reducedMotion.matches) return
      scheduled = true
      requestAnimationFrame(drift)
    },
    { passive: true }
  )

  hero.append(copy, media)
  return hero
}
