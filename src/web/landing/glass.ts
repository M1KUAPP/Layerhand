// @ts-expect-error bun-types declares no *.svg module; Bun bundles it as text.
import layersText from '../assets/landing/layers.svg' with { type: 'text' }

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

// The flat fallback needs the markup inlined: an <img> could not see the
// page's custom properties, which carry the slab colours.
function flatArt(): SVGSVGElement | null {
  const parsed = new DOMParser().parseFromString(layersText, 'image/svg+xml')
  const art = parsed.documentElement
  if (!(art instanceof SVGSVGElement) || art.querySelector('parsererror')) return null
  art.classList.add('glass__art')
  return art
}

const FACTS: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: 'hgi-layer-mask-01',
    title: 'Repaint a mask',
    body: 'Masks stay separate from the pixels, so fixing an edge is a brush stroke, not a redo.'
  },
  {
    icon: 'hgi-sliders-horizontal',
    title: 'Retune an adjustment',
    body: 'An adjustment is a setting on its own layer. Change the number and the photograph follows.'
  },
  {
    icon: 'hgi-view-off',
    title: 'Hide a layer',
    body: 'Every edit sits on a layer of its own. Turn one off and the rest stay as they were.'
  }
]

export function renderGlass(): HTMLElement {
  const section = node('section', 'glass')
  section.dataset.section = 'glass'
  section.setAttribute('aria-labelledby', 'glass-title')

  const object = node('div', 'glass__object')
  object.setAttribute('aria-hidden', 'true')
  const art = flatArt()
  if (art) object.append(art)

  const copy = node('div', 'glass__copy')
  copy.append(node('p', 'glass__eyebrow', 'After the run'))
  const title = node('h2', 'glass__title', 'Still yours to edit.')
  title.id = 'glass-title'
  copy.append(title)
  copy.append(
    node('p', 'glass__body', 'Nothing in the file is baked in. Open the PSD and carry on where the agent stopped.')
  )
  const facts = node('ul', 'glass__facts')
  for (const fact of FACTS) {
    const item = node('li', 'glass__fact')
    const icon = node('i', `glass__fact-icon hgi-stroke ${fact.icon}`)
    icon.setAttribute('aria-hidden', 'true')
    item.append(icon, node('h3', 'glass__fact-title', fact.title), node('p', 'glass__fact-body', fact.body))
    facts.append(item)
  }
  copy.append(facts)

  section.append(object, copy)
  return section
}
