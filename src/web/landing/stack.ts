// The grey sections stack the way the landing body already stacks over the
// hero: each one holds on the viewport while the next rises over it, then
// lets go once the pair has scrolled past. stack.css pins them at
// 1280 px and wider; below that the page scrolls in order.

const PAIRS: Array<[pin: string, sheet: string]> = [
  ['steps', 'switcher'],
  ['drawer', 'glass']
]

export function mountStack(body: HTMLElement): void {
  for (const [pinName, sheetName] of PAIRS) {
    const pin = body.querySelector<HTMLElement>(`[data-section='${pinName}']`)
    const sheet = body.querySelector<HTMLElement>(`[data-section='${sheetName}']`)
    if (!pin || !sheet) continue
    pin.dataset.stack = 'pin'
    sheet.dataset.stack = 'sheet'
    // The wrapper is the pin's sticky bound: once the pair has passed, the
    // pin scrolls away with it and nothing stays stuck under the page.
    const stack = document.createElement('div')
    stack.className = 'stack'
    pin.before(stack)
    stack.append(pin, sheet)

    // A pin taller than the viewport holds its bottom edge on the
    // viewport's; a shorter one holds its top at the top.
    const measure = () => {
      pin.style.setProperty('--stack-top', `${Math.min(0, window.innerHeight - pin.offsetHeight)}px`)
    }
    measure()
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(pin)
    window.addEventListener('resize', measure)
  }
}
