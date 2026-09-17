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

function icon(name: string, className?: string): HTMLElement {
  const result = node('i', `hgi-stroke ${name}${className ? ` ${className}` : ''}`)
  result.setAttribute('aria-hidden', 'true')
  return result
}

interface DrawerLayer {
  name: string
  kind: 'raster' | 'adjustment'
  icon: string
  mask?: boolean
  note?: string
}

// The four layers of the September 15 native-steering run, bottom of the
// stack first, as its summary.json lists them.
const LAYERS: DrawerLayer[] = [
  { name: 'Original photograph', kind: 'raster', icon: 'hgi-image-01' },
  { name: 'Brighten the photograph', kind: 'adjustment', icon: 'hgi-sliders-horizontal', mask: true },
  { name: 'Warm the colours', kind: 'adjustment', icon: 'hgi-sliders-horizontal', mask: true },
  {
    name: 'Very subtle corner vignette',
    kind: 'raster',
    icon: 'hgi-image-01',
    note: 'Shaped by the correction sent mid-run: “Keep the vignette very subtle, and leave the middle of the photograph untouched.”'
  }
]

// The run's own narration, as its events.ndjson recorded it. The steps the
// log leaves out are summarised in one line rather than invented.
const LOG_BEFORE = [
  'I’ll inspect the editor and create the brightness adjustment.',
  'I’ll add Brightness/Contrast as an editable adjustment layer.',
  'I’ll gently brighten the scene while retaining its soft highlights.'
]
const CORRECTION = 'Keep the vignette very subtle, and leave the middle of the photograph untouched.'
const LOG_AFTER = [
  'I’ll use restrained warmth and keep the vignette off the middle.',
  'I’ll name the warming layer clearly.',
  'I’ll label both adjustments and add a separate vignette layer.'
]
const LOG_END = 'I’ll close the menu and check the final layered result.'

interface DrawerStat {
  value: string
  label: string
  to: number
  format(total: number): string
}

// '3 min 13 s' counts its seconds, from 0 to 193.
const formatRunDuration = (total: number): string => `${Math.floor(total / 60)} min ${total % 60} s`

const STATS: DrawerStat[] = [
  { value: '16', label: 'steps, start to PSD', to: 16, format: String },
  { value: '3 min 13 s', label: 'for the whole run', to: 193, format: formatRunDuration },
  { value: '194 ms', label: 'to accept the correction', to: 194, format: (total) => `${total} ms` },
  { value: '4', label: 'named layers handed back', to: 4, format: String }
]

const COUNT_TICK_MS = 50
const COUNT_DURATION_MS = 1200
// The last row lands at 8 x 300ms + --duration-enter; this clears every
// part of the sequence.
const PLAYBACK_DONE_MS = 3400

function countUp(span: HTMLElement, stat: DrawerStat): void {
  let elapsed = 0
  span.textContent = stat.format(0)
  const timer = window.setInterval(() => {
    elapsed += COUNT_TICK_MS
    if (elapsed >= COUNT_DURATION_MS) {
      window.clearInterval(timer)
      span.textContent = stat.format(stat.to)
      return
    }
    span.textContent = stat.format(Math.round((stat.to * elapsed) / COUNT_DURATION_MS))
  }, COUNT_TICK_MS)
}

function logStep(number: number, text: string): HTMLElement {
  const row = node('li', 'drawer__step')
  row.append(
    node('span', 'drawer__step-number', String(number).padStart(2, '0')),
    node('span', 'drawer__step-text', text)
  )
  return row
}

function renderLog(): HTMLElement {
  const log = node('div', 'drawer__log')
  log.setAttribute('role', 'group')
  log.setAttribute('aria-labelledby', 'drawer-log-title')
  const head = node('div', 'drawer__log-head')
  const title = node('p', 'drawer__log-title', 'Run log')
  title.id = 'drawer-log-title'
  head.append(title, node('p', 'drawer__log-meta', 'September 15 · the deployed service'))

  const steps = node('ol', 'drawer__steps')
  const rows: HTMLElement[] = []
  for (const [index, text] of LOG_BEFORE.entries()) rows.push(logStep(index + 1, text))
  const correction = node('li', 'drawer__step drawer__step--correction')
  const said = node('div', 'drawer__said')
  said.append(
    node('span', 'drawer__said-label', 'Correction, typed after step 3'),
    node('span', 'drawer__said-text', `“${CORRECTION}”`),
    node('span', 'drawer__said-meta', 'Accepted in 194 ms. Nothing restarted.')
  )
  correction.append(icon('hgi-message-edit-01', 'drawer__said-icon'), said)
  rows.push(correction)
  for (const [index, text] of LOG_AFTER.entries()) rows.push(logStep(index + 4, text))
  const gap = node('li', 'drawer__step drawer__step--gap')
  gap.append(
    node('span', 'drawer__step-number', '...'),
    node('span', 'drawer__step-text', 'Steps 7 to 15 paint the corners, finish the names and save the PSD.')
  )
  rows.push(gap, logStep(16, LOG_END))
  // --i is each row's place in the playback order; drawer.css multiplies
  // it by 300ms for the stagger.
  for (const [index, row] of rows.entries()) {
    row.style.setProperty('--i', String(index))
    steps.append(row)
  }

  log.append(head, steps)
  return log
}

function renderLayer(layer: DrawerLayer): HTMLElement {
  const row = node('li', 'drawer__layer')
  row.dataset.kind = layer.kind
  row.append(
    icon(layer.icon, 'drawer__layer-icon'),
    node('span', 'drawer__layer-name', layer.name),
    node('span', 'drawer__layer-kind', layer.kind === 'raster' ? 'Raster layer' : 'Adjustment layer')
  )
  // The mask cell stays empty on raster rows so the column still lines
  // up across every row of the sheet.
  const mask = node('span', 'drawer__layer-mask')
  if (layer.mask) mask.append(icon('hgi-layer-mask-01'), 'With mask')
  row.append(mask)
  if (layer.note) {
    const note = node('p', 'drawer__layer-note')
    note.append(icon('hgi-message-edit-01'), layer.note)
    row.append(note)
  }
  return row
}

export function renderDrawer(): HTMLElement {
  const section = node('section', 'drawer')
  section.id = 'real-run'
  section.dataset.section = 'drawer'
  section.setAttribute('aria-labelledby', 'drawer-title')

  section.append(node('p', 'drawer__eyebrow', 'From a real run'))
  const title = node('h2', 'drawer__title', 'Four layers, each named for what it does.')
  title.id = 'drawer-title'
  section.append(title)
  section.append(
    node(
      'p',
      'drawer__body',
      'On September 15, Layerhand was asked to brighten a seascape, warm its colours and darken its corners. Partway through, it was told to keep the vignette very subtle. These are the layers in the PSD it handed back.'
    )
  )

  const stats = node('dl', 'drawer__stats')
  const counts: { span: HTMLElement; stat: DrawerStat }[] = []
  for (const stat of STATS) {
    const item = node('div', 'drawer__stat')
    // The counting number is hidden from assistive technology; the final
    // value sits in a visually hidden span so the measured stats are read
    // from the start, before the playback runs.
    const counting = node('span', 'drawer__stat-count', stat.value)
    counting.setAttribute('aria-hidden', 'true')
    const value = node('dd', 'drawer__stat-value')
    value.append(node('span', 'sr-only', stat.value), counting)
    item.append(node('dt', 'drawer__stat-label', stat.label), value)
    stats.append(item)
    counts.push({ span: counting, stat })
  }
  section.append(stats)

  // The names repeat outside the sheet because the drawer alone cannot
  // carry the message: the sheet stays closed until it is asked for.
  const inline = node('ol', 'drawer__inline')
  for (const layer of LAYERS) {
    const item = node('li', 'drawer__inline-item')
    item.append(icon(layer.icon, 'drawer__inline-icon'), layer.name)
    inline.append(item)
  }
  section.append(inline)

  const openButton = node('button', 'drawer__open')
  openButton.type = 'button'
  openButton.setAttribute('aria-haspopup', 'dialog')
  openButton.setAttribute('aria-controls', 'drawer-sheet')
  openButton.setAttribute('aria-expanded', 'false')
  openButton.append(icon('hgi-layers-01'), 'Show the layers')
  const log = renderLog()
  section.append(openButton, log)

  const scrim = node('div', 'drawer__scrim')
  scrim.setAttribute('aria-hidden', 'true')

  const sheet = node('div', 'drawer__sheet')
  sheet.id = 'drawer-sheet'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-labelledby', 'drawer-sheet-title')
  sheet.inert = true

  const handle = node('div', 'drawer__handle')
  handle.setAttribute('aria-hidden', 'true')

  const head = node('div', 'drawer__head')
  const sheetTitle = node('h3', 'drawer__sheet-title', 'Layers in the exported PSD')
  sheetTitle.id = 'drawer-sheet-title'
  const meta = node('p', 'drawer__meta', '16 steps · 3 min 13 s · one correction')
  const closeButton = node('button', 'drawer__close')
  closeButton.type = 'button'
  closeButton.setAttribute('aria-label', 'Close the layers')
  closeButton.append(icon('hgi-cancel-01'), 'Close')
  head.append(sheetTitle, meta, closeButton)

  const order = node('p', 'drawer__order', 'Bottom of the stack first')
  const layers = node('ol', 'drawer__layers')
  for (const layer of LAYERS) layers.append(renderLayer(layer))
  sheet.append(handle, head, order, layers)

  const setOpen = (opened: boolean) => {
    if (opened) {
      sheet.inert = false
      section.classList.add('is-open')
      // The scrim must not drag the page underneath the sheet.
      document.documentElement.classList.add('drawer-open')
      openButton.setAttribute('aria-expanded', 'true')
      closeButton.focus()
    } else {
      section.classList.remove('is-open')
      document.documentElement.classList.remove('drawer-open')
      openButton.setAttribute('aria-expanded', 'false')
      openButton.focus()
      // A close in the same frame as its open starts no transition, so
      // transitionend never fires; catch that case here.
      if (getComputedStyle(sheet).visibility === 'hidden') sheet.inert = true
    }
  }
  // Inert only once the closing transition ends, so the controls stay
  // reachable if a close is interrupted by a reopen.
  sheet.addEventListener('transitionend', () => {
    if (!section.classList.contains('is-open')) sheet.inert = true
  })
  openButton.addEventListener('click', () => setOpen(true))
  closeButton.addEventListener('click', () => setOpen(false))
  scrim.addEventListener('click', () => setOpen(false))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && section.classList.contains('is-open')) setOpen(false)
  })

  section.append(scrim, sheet)

  // The log plays once, when the section is a third in view. Pending rows
  // are transparent, never display:none, so assistive technology reads the
  // whole run from the start. Without motion or an observer the log never
  // pends and every value shows at once.
  const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (motionAllowed && 'IntersectionObserver' in window) {
    log.dataset.playback = 'pending'
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        log.dataset.playback = 'run'
        for (const count of counts) countUp(count.span, count.stat)
        window.setTimeout(() => {
          log.dataset.playback = 'done'
        }, PLAYBACK_DONE_MS)
      },
      { threshold: 0.3 }
    )
    observer.observe(section)
  }

  return section
}
