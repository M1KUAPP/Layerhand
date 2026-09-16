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
  copy.append(node('p', 'eyebrow', 'A photographic agent inside a real editor'))
  const title = node('h1', undefined, 'Retouch. Keep the layers.')
  title.id = 'landing-title'
  copy.append(title)
  copy.append(node('p', 'lede', 'Layerhand works visibly in Photopea and returns an editable, human-layered PSD.'))
  const start = button('Retouch a photo', 'button button-accent')
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
