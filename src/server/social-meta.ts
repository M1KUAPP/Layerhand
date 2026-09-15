// Link previews (#30): the tags a social site reads from the page's HTML, since
// it runs no script. Their URLs are absolute and built from the service's
// public address when the page is served, never written into the page.

const TAGLINE = 'AI retouching that returns a layered PSD, not a flat JPEG.'

/** Where the preview banners are served. The dark one is for the Product Hunt gallery. */
export const SOCIAL_IMAGE_PATHS = { light: '/og-image.png', dark: '/og-image-dark.png' } as const

function attribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function socialMetaTags(publicUrl: string): string {
  const origin = new URL(publicUrl)
  origin.username = ''
  origin.password = ''
  const page = new URL('/', origin).href
  const image = new URL(SOCIAL_IMAGE_PATHS.light, origin).href
  const tags: [attributeName: 'property' | 'name', key: string, content: string][] = [
    ['property', 'og:type', 'website'],
    ['property', 'og:title', 'Layerhand'],
    ['property', 'og:description', TAGLINE],
    ['property', 'og:url', page],
    ['property', 'og:image', image],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:image', image]
  ]
  return tags.map(([name, key, content]) => `<meta ${name}="${key}" content="${attribute(content)}" />`).join('\n')
}

/** The page with its link preview tags added to the end of its head. */
export function withSocialMeta(page: Response, publicUrl: string): Response {
  const tags = socialMetaTags(publicUrl)
  return new HTMLRewriter()
    .on('head', {
      element(head) {
        head.append(tags, { html: true })
      }
    })
    .transform(page)
}
