interface Step {
  icon: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: 'hgi-image-upload',
    title: 'Drop in a photograph',
    body: 'A JPEG or PNG up to 20 MB. Arrived without one? Start from the sample bottle.'
  },
  {
    icon: 'hgi-text',
    title: 'Say what you want',
    body: 'In plain words, up to 500 characters: brighten it, warm the colours, darken the corners.'
  },
  {
    icon: 'hgi-cursor-01',
    title: 'Watch it work, and correct it',
    body: 'GPT-6 Astra drives Photopea while you watch. Type a correction mid-run and the next steps bend, without starting over.'
  },
  {
    icon: 'hgi-layers-01',
    title: 'Download the layered PSD',
    body: 'Every edit arrives on its own named layer, its mask and adjustment still editable.'
  }
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

function number(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export function renderSteps(): HTMLElement {
  const section = node('section', 'steps')
  section.id = 'how-it-works'
  section.dataset.section = 'steps'
  section.setAttribute('aria-labelledby', 'steps-title')

  const intro = node('div', 'steps__intro')
  const title = node('h2', 'steps__title', 'Four steps, and you can step in on the third.')
  title.id = 'steps-title'
  intro.append(
    node('p', 'steps__eyebrow', 'How it works'),
    title,
    node(
      'p',
      'steps__body',
      'Layerhand paints nothing itself. GPT-6 Astra operates a real image editor the way a retoucher would, so every edit it makes is a layer you can open.'
    )
  )

  // The index repeats the card titles beside the sticky intro and marks
  // the card nearest the middle of the screen. It is a visual aid only.
  const index = node('ol', 'steps__index')
  index.setAttribute('aria-hidden', 'true')
  const list = node('ol', 'steps__list')
  const entries: HTMLElement[] = []
  for (const [position, step] of STEPS.entries()) {
    const entry = node('li', 'steps__index-item')
    entry.append(node('span', 'steps__index-number', number(position)), step.title)
    index.append(entry)
    entries.push(entry)

    const card = node('li', 'steps__card')
    card.dataset.step = String(position)
    const tile = node('span', 'steps__icon')
    const glyph = node('i', `hgi-stroke ${step.icon}`)
    glyph.setAttribute('aria-hidden', 'true')
    tile.append(glyph)
    card.append(
      tile,
      node('span', 'steps__number', number(position)),
      node('h3', 'steps__card-title', step.title),
      node('p', 'steps__card-body', step.body)
    )
    list.append(card)
  }
  entries[0]?.setAttribute('data-active', 'true')
  intro.append(index)

  if ('IntersectionObserver' in window) {
    const watch = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (!record.isIntersecting) continue
          const active = Number((record.target as HTMLElement).dataset.step)
          for (const [position, entry] of entries.entries()) entry.toggleAttribute('data-active', position === active)
        }
      },
      { rootMargin: '-45% 0px -45% 0px' }
    )
    for (const card of list.children) watch.observe(card)
  }

  section.append(intro, list)
  return section
}
