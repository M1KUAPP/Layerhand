// The page and its link preview banners (#30). "/" serves the bundled page
// with the preview tags added, whose URLs must be absolute and come from the
// public address. The page's files are served from routes made here rather
// than by Bun's routes for an HTML import, which cannot add a header (#114).
import type { HTMLBundle } from 'bun'
import { posix } from 'node:path'

import ogImageDarkPath from '../web/assets/og-image-dark.png'
import ogImagePath from '../web/assets/og-image.png'
import { SOCIAL_IMAGE_PATHS, withSocialMeta } from './social-meta'

export interface PageRouteOptions {
  /** The address link previews point at. The request's own origin unless set. */
  publicUrl?: string
}

interface PageFile {
  /** The file's place in the bundle, which is also its address from "/". */
  path: string
  body: Blob
  headers: Record<string, string>
}

async function bundledFiles(page: HTMLBundle): Promise<PageFile[]> {
  // `bun run build` bundles the page ahead of time. The server runs from the
  // build's directory and reads the files there, as Bun's own routes do, and
  // refuses to start without them, as those routes did.
  if (page.files) {
    return Promise.all(
      page.files.map(async ({ path, headers }) => {
        const body = Bun.file(path)
        if (!(await body.exists())) throw new Error(`The page's bundled file ${path} is missing`)
        return { path, body, headers }
      })
    )
  }
  // Run from source, the page is bundled once, as the server starts.
  const { outputs } = await Bun.build({ entrypoints: [page.index], target: 'browser' })
  return outputs.map((output) => ({ path: output.path, body: output, headers: { 'content-type': output.type } }))
}

// The icon file arrives with the brand assets on another branch. The import
// stays dynamic so this module still loads while the asset is absent, and
// Bun emits the bundled file once it exists.
async function favicon(): Promise<Response> {
  try {
    // @ts-expect-error Bun's file loader emits .ico assets and exports a path.
    const { default: faviconPath } = await import('../web/assets/favicon.ico')
    return new Response(Bun.file(faviconPath))
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

export async function pageRoutes(page: HTMLBundle, { publicUrl }: PageRouteOptions = {}) {
  const files = await bundledFiles(page)
  const html = files.find((file) => file.path.endsWith('.html'))!
  return {
    ...Object.fromEntries(
      files
        .filter((file) => file !== html)
        .map((file) => [posix.join('/', file.path), new Response(file.body, { headers: file.headers })])
    ),
    '/': (request: Request) =>
      withSocialMeta(new Response(html.body, { headers: html.headers }), publicUrl ?? new URL(request.url).origin),
    '/favicon.ico': favicon,
    [SOCIAL_IMAGE_PATHS.light]: Bun.file(ogImagePath),
    [SOCIAL_IMAGE_PATHS.dark]: Bun.file(ogImageDarkPath)
  }
}
