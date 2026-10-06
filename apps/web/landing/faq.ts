interface QuestionItem {
  question: string
  answer: string
  span: number
  open?: boolean
}

const QUESTIONS: QuestionItem[] = [
  {
    question: 'What do I get back?',
    answer:
      'A layered PSD. Every edit sits on its own layer, named for what it does, and its masks and adjustment layers stay editable. A flattened PNG comes with it to preview.',
    span: 6,
    open: true
  },
  {
    question: 'Which apps open the file?',
    answer:
      'It is a standard PSD, made to open in Photoshop, Affinity Photo and GIMP, or back in Photopea, where it was made.',
    span: 3
  },
  {
    question: 'How long does a run take?',
    answer: 'A few minutes. The run in the log above took 3 min 13 s from start to PSD. No run goes past 15 minutes.',
    span: 3
  },
  {
    question: 'Can I correct it while it works?',
    answer:
      'Yes. Type a correction at any point and it is acknowledged within three seconds. It shapes the next actions and nothing restarts. It cannot undo a step already taken, but it can repair one.',
    span: 6,
    open: true
  },
  {
    question: 'What kind of retouching does it do?',
    answer:
      'The adjustments a retoucher makes in a real editor, such as exposure, colour, warmth and vignettes, each on its own layer. Describe them in plain words. It works on the photograph you upload and never generates a new image.',
    span: 3
  },
  { question: 'Do I need an account?', answer: 'No. You get three free runs without signing up.', span: 3 },
  {
    question: 'What happens after the free runs?',
    answer: 'Add your own OpenAI API key and carry on. It is used for that run only, and never stored or logged.',
    span: 4
  },
  {
    question: 'What happens to my photographs?',
    answer: 'Uploads are deleted within 24 hours, and download links expire after one hour.',
    span: 4
  },
  {
    question: 'Which photographs can I upload?',
    answer: 'JPEG or PNG, up to 20 MB and 6000 px on the long edge.',
    span: 4
  },
  {
    question: 'What if a run stops early?',
    answer:
      'You still get a layered file with everything done up to that point, marked as incomplete. A run you cancel ends the same way.',
    span: 12
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

export function renderFaq(): HTMLElement {
  const section = node('section', 'faq')
  section.id = 'faq'
  section.dataset.section = 'faq'
  section.setAttribute('aria-labelledby', 'faq-title')

  const eyebrow = node('p', 'faq__eyebrow', 'Questions')
  const title = node('h2', 'faq__title', 'Before your first run.')
  title.id = 'faq-title'

  const grid = node('div', 'faq__grid')

  for (const item of QUESTIONS) {
    const tile = node('details', 'faq__tile')
    tile.style.setProperty('--span', String(item.span))
    tile.dataset.span = String(item.span)
    if (item.open) {
      tile.open = true
    }

    const summary = node('summary', 'faq__question')
    summary.append(document.createTextNode(item.question))

    const plus = node('i', 'hgi-stroke hgi-plus-sign')
    plus.setAttribute('aria-hidden', 'true')
    const minus = node('i', 'hgi-stroke hgi-minus-sign')
    minus.setAttribute('aria-hidden', 'true')
    summary.append(plus, minus)

    const answer = node('p', 'faq__answer', item.answer)

    tile.append(summary, answer)
    grid.append(tile)
  }

  section.append(eyebrow, title, grid)
  return section
}
