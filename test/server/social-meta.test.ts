import { describe, expect, test } from 'bun:test'

import { withSocialMeta } from '../../src/server/social-meta'

const PAGE =
  '<!doctype html><html lang="en"><head><title>Layerhand</title></head><body><main id="app"></main></body></html>'

async function metaOf(response: Response): Promise<Map<string, string>> {
  const meta = new Map<string, string>()
  await new HTMLRewriter()
    .on('meta', {
      element(element) {
        const key = element.getAttribute('property') ?? element.getAttribute('name')
        const content = element.getAttribute('content')
        if (key && content !== null) meta.set(key, content)
      }
    })
    .transform(response)
    .text()
  return meta
}

const page = () => new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } })

describe('link preview tags', () => {
  test('the rendered page carries an absolute og:image built from the public address', async () => {
    const meta = await metaOf(withSocialMeta(page(), 'https://layerhand.test'))

    const image = new URL(meta.get('og:image')!)
    expect(image.href).toBe('https://layerhand.test/og-image.png')
    expect(meta.get('twitter:image')).toBe(image.href)
  })

  test('names the page, its tagline, its address, and the large card', async () => {
    const meta = await metaOf(withSocialMeta(page(), 'https://layerhand.test/some/path'))

    expect(Object.fromEntries(meta)).toEqual({
      'og:type': 'website',
      'og:title': 'Layerhand',
      'og:description': 'AI retouching that returns a layered PSD, not a flat JPEG.',
      'og:url': 'https://layerhand.test/',
      'og:image': 'https://layerhand.test/og-image.png',
      'twitter:card': 'summary_large_image',
      'twitter:image': 'https://layerhand.test/og-image.png'
    })
  })

  test('leaves the rest of the page as it was', async () => {
    const html = await withSocialMeta(page(), 'https://layerhand.test').text()

    expect(html).toContain('<title>Layerhand</title>')
    expect(html).toContain('<main id="app"></main>')
    expect(html.indexOf('og:image')).toBeLessThan(html.indexOf('</head>'))
  })

  test('drops a user name and password from the public address', async () => {
    const html = await withSocialMeta(page(), 'https://deploy-user:deploy-password@layerhand.test').text()

    expect(html).not.toContain('deploy-password')
    expect(
      (await metaOf(withSocialMeta(page(), 'https://deploy-user:deploy-password@layerhand.test'))).get('og:url')
    ).toBe('https://layerhand.test/')
  })
})
