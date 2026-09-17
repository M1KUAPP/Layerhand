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
  section.append(openButton)

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
  return section
}
