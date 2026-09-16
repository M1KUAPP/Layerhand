import samplePhotoUrl from '../assets/sample-photo.png'

import type { LandingContext } from './index'

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

function button(text: string, className = 'button'): HTMLButtonElement {
  const result = node('button', className, text)
  result.type = 'button'
  return result
}

export function renderHero(context: LandingContext): HTMLElement {
  const hero = node('section', 'landing-grid')
  hero.setAttribute('aria-labelledby', 'landing-title')
  const copy = node('div', 'landing-copy')
  const eyebrow = node('p', 'eyebrow enter', 'A photographic agent inside a real editor')
  eyebrow.style.setProperty('--enter-i', '0')
  copy.append(eyebrow)
  const title = node('h1', 'enter', 'Retouch. Keep the layers.')
  title.style.setProperty('--enter-i', '1')
  title.id = 'landing-title'
  copy.append(title)
  const lede = node(
    'p',
    'lede enter',
    'Layerhand works visibly in Photopea and returns an editable, human-layered PSD.'
  )
  lede.style.setProperty('--enter-i', '2')
  copy.append(lede)
  const start = button('Retouch a photo', 'button button-accent enter')
  start.style.setProperty('--enter-i', '3')
  const arrow = node('i', 'hgi-stroke hgi-arrow-right-01')
  arrow.setAttribute('aria-hidden', 'true')
  start.append(arrow)
  start.addEventListener('click', () => context.startRun())
  copy.append(start)
  copy.append(node('p', 'field-hint', 'Uploads are deleted within 24 hours.'))

  const media = node('div', 'landing-media')
  const wedge = node('div', 'wedge')
  wedge.setAttribute('aria-hidden', 'true')
  const video = node('video', 'demo-video')
  video.autoplay = true
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.poster = samplePhotoUrl
  video.setAttribute('aria-label', 'Layerhand retouching demonstration placeholder')
  media.append(video, wedge)
  hero.append(copy, media)
  return hero
}
