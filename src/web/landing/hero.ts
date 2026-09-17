import editorFrameUrl from '../assets/landing/editor-frame.jpg'
import samplePhotoUrl from '../assets/sample-photo-poster.jpg'

import type { LandingContext } from './index'

// Empty until the demo loop is recorded; while it is, the window shows the
// last frame of a real run instead of the video and its toggle.
const LOOP_URL = ''

const TITLE_LINES = [
  ['A', 'layered', 'PSD,'],
  ['not', 'a', 'flat', 'JPEG.']
]

const FACTS = ['Three free runs', 'No account needed', 'Uploads deleted within 24 hours']

// The September 15 computer-tool run on the sample photograph, whose last
// frame the window shows (docs/evidence/driving-mechanism): the
// instruction harness.ts sent, its step count and its exported layers,
// bottom of the stack first. The run recorded no narration and took no
// correction, so the replay shows neither.
const REPLAY_INSTRUCTION = [
  'Make three edits to this photograph, each on its own layer with a name that says what it does:',
  '1. Brighten it with a Levels, Curves, or Brightness/Contrast adjustment layer.',
  '2. Warm its colours with a Photo Filter or Color Balance adjustment layer.',
  '3. Darken the corners into a soft vignette on a new layer.'
].join('\n')
const REPLAY_STEPS = 13
const REPLAY_LAYERS = ['Original photograph', 'Brighten photograph', 'Warm colours', 'Darken corners softly']

// One loop is 12 seconds: 0-3.5s types the instruction, 3.5-9s counts the
// steps along the bar, 9-11s stacks the layers, 11-12s holds.
const REPLAY_LOOP_MS = 12_000
const REPLAY_TYPE_MS = 3_500
const REPLAY_STEPS_MS = 5_500
const REPLAY_LAYERS_MS = 9_000
const REPLAY_LAYER_MS = 500

// Claims the page makes in full further down, repeated as a moving band.
const TICKER = [
  'Named layers',
  'Editable masks',
  'Adjustment layers',
  'Correct it mid-run',
  'Driven in Photopea',
  'Built on GPT-6 Astra',
  'Opens in Photoshop'
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

// A replay of the run the still frame ends on, laid over the lower part of
// the window: the typed instruction, the step counter on its bar and the
// layer stack the run produced, looping until paused.
function mountReplay(screen: HTMLElement, reducedMotion: MediaQueryList): void {
  const replay = node('div', 'hero__replay')
  replay.setAttribute('aria-hidden', 'true')

  const prompt = node('p', 'hero__replay-prompt')
  const promptText = node('span', 'hero__replay-text')
  prompt.append(promptText)

  const progress = node('div', 'hero__replay-progress')
  const step = node('span', 'hero__replay-step')
  const bar = node('span', 'hero__replay-bar')
  bar.append(node('span', 'hero__replay-fill'))
  progress.append(step, bar)

  const layers = node('ul', 'hero__replay-layers')
  const caption = node('p', 'hero__replay-caption', 'A 1 min 42 s run, shown faster')
  replay.append(prompt, progress, layers, caption)

  const toggle = node('button', 'hero__replay-toggle')
  toggle.type = 'button'
  const toggleIcon = icon('hgi-pause')
  const toggleText = node('span', undefined, 'Pause the replay')
  toggle.append(toggleIcon, toggleText)
  const showToggle = (playing: boolean): void => {
    toggleIcon.className = `hgi-stroke ${playing ? 'hgi-pause' : 'hgi-play'}`
    toggleText.textContent = playing ? 'Pause the replay' : 'Play the replay'
    toggle.setAttribute('aria-label', toggleText.textContent ?? '')
  }
  showToggle(true)

  screen.append(replay, toggle)

  // The whole loop is one function of the elapsed time in it.
  let layerCount = -1
  const render = (elapsed: number): void => {
    const typed = Math.floor(Math.min(1, elapsed / REPLAY_TYPE_MS) * REPLAY_INSTRUCTION.length)
    promptText.textContent = REPLAY_INSTRUCTION.slice(0, typed)
    progress.style.setProperty(
      '--replay-progress',
      String(Math.min(1, Math.max(0, (elapsed - REPLAY_TYPE_MS) / REPLAY_STEPS_MS)))
    )
    step.textContent =
      elapsed < REPLAY_TYPE_MS
        ? ''
        : `Step ${Math.min(REPLAY_STEPS, 1 + Math.floor((elapsed - REPLAY_TYPE_MS) / (REPLAY_STEPS_MS / REPLAY_STEPS)))} of ${REPLAY_STEPS}`
    const count =
      elapsed < REPLAY_LAYERS_MS
        ? 0
        : Math.min(REPLAY_LAYERS.length, 1 + Math.floor((elapsed - REPLAY_LAYERS_MS) / REPLAY_LAYER_MS))
    if (count !== layerCount) {
      layerCount = count
      // The stack fills from the bottom, so the newest name lands on top,
      // the way a layers panel lists it.
      layers.replaceChildren(
        ...REPLAY_LAYERS.slice(0, count)
          .map((name) => node('li', undefined, name))
          .reverse()
      )
    }
  }

  let elapsed = 0
  let last = 0
  let primed = false
  let running = false
  let paused = false
  // The hero is above the fold when it mounts; the observer refines this.
  let inView = true
  let frame = 0

  const active = (): boolean => inView && !paused && !document.hidden && !reducedMotion.matches
  const tick = (now: number): void => {
    if (!running) return
    // The first frame after a start only marks the clock's epoch, so a
    // pause freezes the elapsed time instead of swallowing the gap.
    if (primed) elapsed += now - last
    primed = true
    last = now
    let point = elapsed % REPLAY_LOOP_MS
    // The exact wrap still shows the hold frame; the next one starts over.
    if (point === 0 && elapsed > 0) point = REPLAY_LOOP_MS
    render(point)
    frame = requestAnimationFrame(tick)
  }
  const sync = (): void => {
    if (active() && !running) {
      running = true
      primed = false
      frame = requestAnimationFrame(tick)
    } else if (!active() && running) {
      running = false
      cancelAnimationFrame(frame)
    }
  }
  toggle.addEventListener('click', () => {
    paused = !paused
    showToggle(!paused)
    sync()
  })
  document.addEventListener('visibilitychange', sync)
  if ('IntersectionObserver' in window) {
    const watch = new IntersectionObserver((records) => {
      inView = records.some((record) => record.isIntersecting)
      sync()
    })
    watch.observe(screen)
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) render(REPLAY_LOOP_MS)
    sync()
  })

  // Under reduced motion the replay holds its finished frame, nothing moves
  // by itself and the toggle hides.
  render(reducedMotion.matches ? REPLAY_LOOP_MS : 0)
  sync()
}

function renderWindow(reducedMotion: MediaQueryList): HTMLElement {
  const window_ = node('div', 'hero__window')
  const bar = node('div', 'hero__bar')
  bar.setAttribute('aria-hidden', 'true')
  bar.append(
    node('span', 'hero__bar-dots'),
    node('span', 'hero__bar-title', 'sample-photo.png · Photopea, driven by Layerhand')
  )
  const screen = node('div', 'hero__screen')
  window_.append(bar, screen)

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
    screen.append(video, toggle)
  } else {
    const photo = node('img', 'hero__photo')
    photo.src = editorFrameUrl
    photo.alt =
      'Photopea at the end of a Layerhand run on the sample photograph of a blue glass bottle. Its Layers panel lists Darken corners softly, Warm colours, Brighten photograph and Original photograph.'
    screen.append(photo)
    mountReplay(screen, reducedMotion)
  }
  return window_
}

export function renderHero(context: LandingContext): HTMLElement {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  // landing-grid is the foundation's structural hook for the hero; the
  // section's own styling hangs off .hero.
  const hero = node('section', 'hero landing-grid')
  hero.dataset.section = 'hero'
  hero.setAttribute('aria-labelledby', 'hero-title')

  const copy = node('div', 'hero__copy')
  const eyebrow = enter(node('p', 'hero__eyebrow'), 0)
  eyebrow.append(
    node('span', 'hero__eyebrow-label', 'AI retouching'),
    node('span', 'hero__eyebrow-note', 'Built on GPT-6 Astra')
  )
  copy.append(eyebrow)

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
  updates.append(node('span', 'hero__updates-text', 'Get launch updates by email'), icon('hgi-arrow-down-01'))
  const facts = node('ul', 'hero__facts')
  for (const fact of FACTS) {
    const item = node('li', 'hero__fact')
    item.append(icon('hgi-tick-02'), fact)
    facts.append(item)
  }
  actions.append(
    cta,
    updates,
    facts,
    node('p', 'hero__note-desktop', 'The workbench needs a desktop at least 1280 px wide.')
  )
  copy.append(actions)

  const media = enter(node('div', 'hero__media'), 2)
  const plate = node('figure', 'hero__plate')
  const steps = node('p', 'hero__chip hero__chip--steps')
  steps.setAttribute('aria-hidden', 'true')
  steps.append(icon('hgi-layers-01'), node('strong', undefined, '4 named layers'), ' in 13 steps')
  const steer = node('p', 'hero__chip hero__chip--steer')
  steer.setAttribute('aria-hidden', 'true')
  steer.append(icon('hgi-message-edit-01'), 'Correct it while it works')
  plate.append(
    renderWindow(reducedMotion),
    steps,
    steer,
    node(
      'figcaption',
      'hero__caption',
      'The last frame of a real run on the sample photograph, which you can try in the workbench.'
    )
  )
  media.append(plate)

  // One write per frame at most; under reduced motion nothing drifts. The
  // hero is pinned, so progress is how far the page has slid over it.
  let scheduled = false
  const drift = (): void => {
    scheduled = false
    const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight)))
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

export function renderTicker(): HTMLElement {
  const band = node('div', 'ticker')
  const track = node('div', 'ticker__track')
  // Rendered twice because the loop moves by half its width; the copy is
  // hidden from assistive technology so the claims are read once.
  for (const copy of [0, 1]) {
    const list = node('ul', 'ticker__list')
    if (copy === 1) list.setAttribute('aria-hidden', 'true')
    for (const claim of TICKER) list.append(node('li', 'ticker__item', claim))
    track.append(list)
  }

  // Moving text that runs past five seconds needs a way to stop it
  // (WCAG 2.2.2), whatever the motion setting.
  const toggle = node('button', 'ticker__toggle')
  toggle.type = 'button'
  const toggleIcon = icon('hgi-pause')
  toggle.append(toggleIcon)
  const show = (paused: boolean): void => {
    band.dataset.paused = String(paused)
    toggleIcon.className = `hgi-stroke ${paused ? 'hgi-play' : 'hgi-pause'}`
    toggle.setAttribute('aria-label', paused ? 'Play the moving list' : 'Pause the moving list')
  }
  toggle.addEventListener('click', () => show(band.dataset.paused !== 'true'))
  show(false)

  band.append(track, toggle)
  return band
}
