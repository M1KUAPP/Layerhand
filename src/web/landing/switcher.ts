import photoUrl from '../assets/sample-photo-poster.jpg'

type LayerKey = 'corners' | 'warm' | 'brighten' | 'original'
type Mode = 'psd' | 'jpeg'

interface SwitcherLayer {
  key: LayerKey
  name: string
  kind: string
  thumb: 'photo' | 'adjustment' | 'corners'
}

// The four layers a September 15 run gave the sample photograph, top of the
// stack first as a layers panel lists them (driving-mechanism evidence,
// computer-1-sample-photo.png). Their effects here are drawn by the browser.
const LAYERS: SwitcherLayer[] = [
  { key: 'corners', name: 'Darken corners softly', kind: 'Raster · mask · 30%', thumb: 'corners' },
  { key: 'warm', name: 'Warm colours', kind: 'Adjustment · mask', thumb: 'adjustment' },
  { key: 'brighten', name: 'Brighten photograph', kind: 'Adjustment · mask', thumb: 'adjustment' },
  { key: 'original', name: 'Original photograph', kind: 'Raster', thumb: 'photo' }
]

const HINTS: Record<Mode, string> = {
  psd: 'Switch a layer off. The others stay exactly as they were.',
  jpeg: 'A flat JPEG is one layer. Every edit is baked in, and nothing is left to switch.'
}

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

function thumb(layer: SwitcherLayer): HTMLElement {
  const result = node('span', 'switcher__thumb')
  result.dataset.thumb = layer.thumb
  if (layer.thumb === 'photo') {
    const image = node('img')
    image.src = photoUrl
    image.alt = ''
    result.append(image)
  } else if (layer.thumb === 'adjustment') {
    result.append(icon('hgi-sliders-horizontal'))
  }
  return result
}

export function renderSwitcher(): HTMLElement {
  const section = node('section', 'switcher')
  section.id = 'layers'
  section.dataset.section = 'switcher'
  section.setAttribute('aria-labelledby', 'switcher-title')

  const copy = node('div', 'switcher__copy')
  const title = node('h2', 'switcher__title')
  title.id = 'switcher-title'
  // The space between the two lines lives inside the first line so the
  // headline reads as one sentence pair without an anonymous blank box.
  const firstLine = node('span', 'switcher__line', 'A flat JPEG keeps the result.')
  firstLine.append(' ')
  title.append(firstLine, node('span', 'switcher__line', 'A PSD keeps the work.'))

  const modes = node('div', 'switcher__modes')
  modes.setAttribute('role', 'group')
  modes.setAttribute('aria-label', 'Show the result as')
  const jpegButton = node('button', 'switcher__mode', 'Flat JPEG')
  const psdButton = node('button', 'switcher__mode', 'Layered PSD')
  for (const button of [jpegButton, psdButton]) button.type = 'button'
  modes.append(jpegButton, psdButton)

  const hint = node('p', 'switcher__hint')
  hint.setAttribute('aria-live', 'polite')

  copy.append(
    node('p', 'switcher__eyebrow', 'Why layers'),
    title,
    node(
      'p',
      'switcher__body',
      'Retouching is a stack of separate decisions, from the photograph at the bottom to the last adjustment on top. Layerhand hands the stack back as it was built, so one decision can change without redoing the rest.'
    ),
    modes,
    hint
  )

  const figure = node('figure', 'switcher__figure')
  const window_ = node('div', 'switcher__window')
  const stage = node('div', 'switcher__stage')
  const photo = node('img', 'switcher__photo')
  photo.src = photoUrl
  photo.alt =
    'The sample photograph of a blue glass bottle on a paper backdrop, with the layers switched on shown over it.'
  const file = node('p', 'switcher__file')
  stage.append(photo, node('div', 'switcher__warm'), node('div', 'switcher__corners'), file)

  const panel = node('div', 'switcher__panel')
  const head = node('div', 'switcher__panel-head')
  const count = node('span', 'switcher__count')
  head.append(node('span', 'switcher__panel-title', 'Layers'), count)

  const list = node('ol', 'switcher__layers')
  const visible: Record<LayerKey, boolean> = { corners: true, warm: true, brighten: true, original: true }
  const eyes: HTMLButtonElement[] = []
  for (const layer of LAYERS) {
    const row = node('li', 'switcher__layer')
    row.dataset.layer = layer.key
    const eye = node('button', 'switcher__eye')
    eye.type = 'button'
    eye.setAttribute('aria-label', `Show ${layer.name}`)
    const eyeIcon = icon('hgi-view')
    eye.append(eyeIcon)
    const label = node('span', 'switcher__label')
    label.append(node('span', 'switcher__name', layer.name), node('span', 'switcher__kind', layer.kind))
    row.append(eye, thumb(layer), label)
    list.append(row)
    eyes.push(eye)

    eye.addEventListener('click', () => {
      visible[layer.key] = !visible[layer.key]
      paint()
    })
  }

  const flat = node('div', 'switcher__flat')
  const flatLabel = node('span', 'switcher__label')
  flatLabel.append(node('span', 'switcher__name', 'Background'), node('span', 'switcher__kind', 'Flattened · locked'))
  const lock = node('span', 'switcher__lock')
  lock.append(icon('hgi-square-lock-02'))
  flat.append(lock, flatLabel)

  panel.append(head, list, flat)
  window_.append(stage, panel)
  figure.append(
    window_,
    node(
      'figcaption',
      'switcher__caption',
      'An illustration: the sample photograph with the four layers of a real run, drawn in your browser.'
    )
  )

  let mode: Mode = 'psd'
  const paint = (): void => {
    stage.dataset.mode = mode
    panel.dataset.mode = mode
    jpegButton.setAttribute('aria-pressed', String(mode === 'jpeg'))
    psdButton.setAttribute('aria-pressed', String(mode === 'psd'))
    file.textContent = mode === 'psd' ? 'sample-photo.psd' : 'sample-photo.jpg'
    count.textContent = mode === 'psd' ? '4' : '1'
    hint.textContent = HINTS[mode]
    list.inert = mode === 'jpeg'
    for (const [index, layer] of LAYERS.entries()) {
      const on = visible[layer.key]
      stage.dataset[layer.key] = on ? 'on' : 'off'
      const eye = eyes[index]!
      eye.setAttribute('aria-pressed', String(on))
      eye.firstElementChild!.className = `hgi-stroke ${on ? 'hgi-view' : 'hgi-view-off'}`
      eye.parentElement!.dataset.hidden = String(!on)
    }
  }
  jpegButton.addEventListener('click', () => {
    mode = 'jpeg'
    paint()
  })
  psdButton.addEventListener('click', () => {
    mode = 'psd'
    paint()
  })
  paint()

  section.append(copy, figure)
  return section
}
