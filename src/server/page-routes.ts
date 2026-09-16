// The page and its link preview banners (#30). "/" serves the bundled page
// with the preview tags added, whose URLs must be absolute and come from the
// public address. The page's files are served from routes made here rather
// than by Bun's routes for an HTML import, which cannot add a header, so
// every one of them carries the API's security headers (#114) — except under
// LAYERHAND_PAGE_RELOAD, which trades the headers for Bun's own reloading
// route so a page edit shows up without a restart.
import type { HTMLBundle } from 'bun'
import { posix } from 'node:path'

import ogImageDarkPath from '../web/assets/og-image-dark.png'
import ogImagePath from '../web/assets/og-image.png'
import { SECURITY_HEADERS } from './application'
import { SOCIAL_IMAGE_PATHS, withSocialMeta } from './social-meta'

const PAGE_SHELL_PATH = '/page-shell'

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

function securedResponse(body: Blob, headers: Record<string, string> = {}): Response {
  return new Response(body, { headers: { ...headers, ...SECURITY_HEADERS } })
}

// The icon file arrives with the brand assets on another branch. The import
// stays dynamic so this module still loads while the asset is absent, and
// Bun emits the bundled file once it exists.
async function favicon(): Promise<Response> {
  try {
    // @ts-expect-error Bun's file loader emits .ico assets and exports a path.
    const { default: faviconPath } = await import('../web/assets/favicon.ico')
    return securedResponse(Bun.file(faviconPath))
  } catch {
    return new Response('Not found', { status: 404, headers: SECURITY_HEADERS })
  }
}

// The reloading and secured route tables differ in shape (only the secured
// one keys every bundled file), so this is typed by value rather than by the
// literal keys Bun infers from a single object, which fixed key set neither
// table alone has.
type PageRoute = Response | HTMLBundle | ((request: Request) => Response | Promise<Response>)

export async function pageRoutes(
  page: HTMLBundle,
  { publicUrl }: PageRouteOptions = {}
): Promise<Record<string, PageRoute>> {
  const banners = {
    '/favicon.ico': favicon,
    [SOCIAL_IMAGE_PATHS.light]: securedResponse(Bun.file(ogImagePath)),
    [SOCIAL_IMAGE_PATHS.dark]: securedResponse(Bun.file(ogImageDarkPath))
  }

  if (process.env.LAYERHAND_PAGE_RELOAD) {
    // Bun's own route for an HTML import rebundles the page on every
    // request under `bun --hot`, so an edit under src/web shows up without a
    // restart. It cannot carry a header, so only `bun run dev` sets this
    // flag; `bun run start` and every test leave it unset and stay secured.
    return {
      [PAGE_SHELL_PATH]: page,
      '/': async (request: Request) => {
        const shell = await fetch(new URL(PAGE_SHELL_PATH, request.url))
        return withSocialMeta(shell, publicUrl ?? new URL(request.url).origin)
      },
      ...banners
    }
  }

  const files = await bundledFiles(page)
  const html = files.find((file) => file.path.endsWith('.html'))!
  return {
    ...Object.fromEntries(
      files
        .filter((file) => file !== html)
        .map((file) => [posix.join('/', file.path), securedResponse(file.body, file.headers)])
    ),
    '/': (request: Request) =>
      withSocialMeta(securedResponse(html.body, html.headers), publicUrl ?? new URL(request.url).origin),
    ...banners
  }
}
