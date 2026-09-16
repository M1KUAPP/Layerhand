import endUrl from '../assets/landing/scrub-end.jpg'
import posterUrl from '../assets/landing/scrub-poster.jpg'
import clipUrl from '../assets/landing/scrub.mp4'

const SCRUB_SMOOTHING = 0.12
const SEEK_EPSILON_S = 0.04
const TAIL_GUARD_S = 0.05
const CACHE_DELAY_MS = 300
const CACHE_MAX_FRAMES = 90
const CACHE_FPS = 12
const CACHE_MIN_FRAMES = 24
const CACHE_MAX_WIDTH = 960
const MAX_DPR = 2

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
  const title = node('h2', 'scrub__title')
  title.id = 'scrub-title'
  // The space between the two lines lives inside the first line so the
  // headline reads as one sentence pair without an anonymous blank box.
  const firstLine = node('span', 'scrub__line', 'A flat JPEG keeps the result.')
  firstLine.append(' ')
  title.append(firstLine, node('span', 'scrub__line', 'A PSD keeps the work.'))
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
  // The poster is frame zero, the plain photograph, so the swap to the
  // video does not jump. Under reduced motion there is no video, so the
  // still is the clip's last frame, with the sheets over the photograph.
  const picture = node('picture', 'scrub__picture')
  const still = node('source')
  still.media = '(prefers-reduced-motion: reduce)'
  still.srcset = endUrl
  const poster = node('img', 'scrub__poster')
  poster.alt = ''
  poster.src = posterUrl
  picture.append(still, poster)
  frame.append(picture)
  const figure = node('figure', 'scrub__figure')
  figure.append(frame, node('figcaption', 'scrub__caption', 'An illustration. The layers from a real run come next.'))

  const stage = node('div', 'scrub__stage')
  stage.append(copy, figure)
  const track = node('div', 'scrub__track')
  track.append(stage)
  section.append(track)

  const motion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  const wide = window.matchMedia('(min-width: 1280px)').matches
  if (motion && wide) startScrub(section, track, frame)
  return section
}

function seeked(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => video.addEventListener('seeked', () => resolve(), { once: true }))
}

function startScrub(section: HTMLElement, track: HTMLElement, frame: HTMLElement): void {
  const video = node('video', 'scrub__video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = clipUrl
  video.setAttribute('aria-hidden', 'true')
  const canvas = node('canvas', 'scrub__canvas')
  canvas.setAttribute('aria-hidden', 'true')
  frame.append(video, canvas)
  const context = canvas.getContext('2d')
  if (!context) return

  // A detached twin feeds the cache so its seeking never flickers the
  // frame the visitor is watching.
  const extractor = node('video')
  extractor.muted = true
  extractor.playsInline = true
  extractor.preload = 'auto'
  extractor.src = clipUrl

  let smoothed = 0
  let frames: ImageBitmap[] = []
  let drawn = -1
  let raf = 0

  const targetProgress = (): number => {
    const top = track.getBoundingClientRect().top + window.scrollY
    const range = track.offsetHeight - window.innerHeight
    if (range <= 0) return 0
    return Math.min(1, Math.max(0, (window.scrollY - top) / range))
  }

  const draw = (index: number): void => {
    const bitmap = frames[index]
    if (!bitmap) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const width = Math.round(frame.clientWidth * dpr)
    const height = Math.round(frame.clientHeight * dpr)
    if (width <= 0 || height <= 0) return
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    } else if (index === drawn) {
      return
    }
    drawn = index
    const scale = Math.max(width / bitmap.width, height / bitmap.height)
    const w = bitmap.width * scale
    const h = bitmap.height * scale
    context.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h)
  }

  const tick = (): void => {
    smoothed += (targetProgress() - smoothed) * SCRUB_SMOOTHING
    if (frames.length > 0) {
      draw(Math.round(smoothed * (frames.length - 1)))
    } else if (Number.isFinite(video.duration) && video.duration > 0) {
      const time = smoothed * (video.duration - TAIL_GUARD_S)
      if (Math.abs(time - video.currentTime) > SEEK_EPSILON_S) video.currentTime = time
    }
  }

  const buildCache = async (): Promise<void> => {
    const duration = extractor.duration
    const sourceWidth = extractor.videoWidth
    const sourceHeight = extractor.videoHeight
    if (!Number.isFinite(duration) || duration <= 0 || sourceWidth <= 0) return
    const count = Math.min(CACHE_MAX_FRAMES, Math.max(CACHE_MIN_FRAMES, Math.floor(duration * CACHE_FPS)))
    const width = Math.min(CACHE_MAX_WIDTH, sourceWidth)
    const height = Math.round((sourceHeight * width) / sourceWidth)
    const bitmaps: ImageBitmap[] = []
    for (let i = 0; i < count; i++) {
      const time = (i / (count - 1)) * (duration - TAIL_GUARD_S)
      if (Math.abs(extractor.currentTime - time) > 0.001) {
        const ready = seeked(extractor)
        extractor.currentTime = time
        await ready
      }
      try {
        bitmaps.push(await createImageBitmap(extractor, { resizeWidth: width, resizeHeight: height }))
      } catch {
        break
      }
    }
    if (bitmaps.length > 0) {
      frames = bitmaps
      drawn = -1
      frame.classList.add('scrub__frame--cached')
    }
  }

  video.addEventListener('loadeddata', () => frame.classList.add('scrub__frame--live'), { once: true })
  extractor.addEventListener('loadeddata', () => window.setTimeout(() => void buildCache(), CACHE_DELAY_MS), {
    once: true
  })

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1]
    if (entry?.isIntersecting) {
      if (raf === 0) {
        smoothed = targetProgress()
        raf = requestAnimationFrame(function loop() {
          tick()
          raf = requestAnimationFrame(loop)
        })
      }
    } else if (raf !== 0) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  })
  observer.observe(section)
}
