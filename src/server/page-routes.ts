// The page and its link preview banners (#30). "/" serves the bundled page
// with the preview tags added, whose URLs must be absolute and come from the
// public address. The page's files are served from routes made here rather
// than by Bun's routes for an HTML import, which cannot add a header, so
// every one of them carries the API's security headers (#114) — except under
// LAYERHAND_PAGE_RELOAD, which trades the headers for Bun's own reloading
// route so a page edit shows up without a restart.
import type { HTMLBundle } from 'bun'
import { posix } from 'node:path'
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib'

import ogImageDarkPath from '../web/assets/og-image-dark.png'
import ogImagePath from '../web/assets/og-image.png'
import { SECURITY_HEADERS } from './application'
import claudeMarketplace from './claude-marketplace.json'
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
  // Run from source, the page is bundled once, as the server starts. `throw:
  // false` trades Bun.build()'s default AggregateError for its logs, which
  // this surfaces itself so a bundling failure is never silent.
  const build = await Bun.build({ entrypoints: [page.index], target: 'browser', throw: false })
  if (!build.success) {
    throw new Error(`The page failed to bundle: ${build.logs.map((log) => log.message).join('; ')}`)
  }
  return build.outputs.map((output) => ({ path: output.path, body: output, headers: { 'content-type': output.type } }))
}

function securedResponse(body: BodyInit, headers: Record<string, string> = {}): Response {
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

type SelectedEncoding = 'br' | 'gzip' | 'identity' | 'not-acceptable'

const BROTLI_OPTIONS = {
  params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 }
}

const QVALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/

function quality(params: string[]): number {
  let result = 1
  let seen = false
  for (const param of params) {
    const separator = param.indexOf('=')
    const name = (separator === -1 ? param : param.slice(0, separator)).trim()
    if (name.toLowerCase() !== 'q') continue
    if (seen) return 0
    seen = true
    const value = separator === -1 ? undefined : param.slice(separator + 1).trim()
    if (!value || !QVALUE.test(value)) return 0
    result = Number(value)
  }
  return result
}

function parseAcceptEncoding(header: string | null): SelectedEncoding {
  if (!header) return 'identity'

  let qBr: number | undefined
  let qGzip: number | undefined
  let qIdentity: number | undefined
  let qWildcard: number | undefined

  for (const part of header.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const [encodingRaw, ...params] = trimmed.split(';')
    if (!encodingRaw) continue
    const encoding = encodingRaw.trim().toLowerCase()
    const q = quality(params)
    if (encoding === 'br') {
      qBr = q
    } else if (encoding === 'gzip') {
      qGzip = q
    } else if (encoding === 'identity') {
      qIdentity = q
    } else if (encoding === '*') {
      qWildcard = q
    }
  }

  const effectiveBr = qBr ?? qWildcard ?? 0
  const effectiveGzip = qGzip ?? qWildcard ?? 0
  const effectiveIdentity = qIdentity ?? (qWildcard === 0 ? 0 : 1)

  const preferredCompression = effectiveBr >= effectiveGzip ? 'br' : 'gzip'
  const preferredCompressionQuality = Math.max(effectiveBr, effectiveGzip)
  if (qIdentity !== undefined && effectiveIdentity > preferredCompressionQuality) return 'identity'
  if (preferredCompressionQuality > 0) return preferredCompression

  return effectiveIdentity > 0 ? 'identity' : 'not-acceptable'
}

function varyByAcceptEncoding(init: HeadersInit): Headers {
  const headers = new Headers(init)
  const vary = headers.get('vary')
  const values = vary
    ? vary
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  if (!values.some((value) => value === '*' || value.toLowerCase() === 'accept-encoding')) {
    values.push('Accept-Encoding')
    headers.set('vary', values.join(', '))
  }
  return headers
}

function isCompressibleText(path: string, contentType?: string): boolean {
  const extension = posix.extname(path).toLowerCase()
  if (
    extension === '.html' ||
    extension === '.js' ||
    extension === '.mjs' ||
    extension === '.css' ||
    extension === '.svg'
  ) {
    return true
  }
  if (contentType) {
    const type = contentType.toLowerCase()
    return (
      type.startsWith('text/html') ||
      type.startsWith('text/javascript') ||
      type.startsWith('application/javascript') ||
      type.startsWith('text/css') ||
      type.startsWith('image/svg+xml')
    )
  }
  return false
}

async function precomputeTextFileRoute(file: PageFile): Promise<PageRoute> {
  const uncompressed = Buffer.from(await file.body.arrayBuffer())
  const br = brotliCompressSync(uncompressed, BROTLI_OPTIONS)
  const gzip = gzipSync(uncompressed)

  const headers = varyByAcceptEncoding({
    ...file.headers,
    ...SECURITY_HEADERS
  })
  headers.delete('content-length')

  const brHeaders = new Headers(headers)
  brHeaders.set('content-encoding', 'br')
  brHeaders.set('content-length', String(br.byteLength))
  const gzipHeaders = new Headers(headers)
  gzipHeaders.set('content-encoding', 'gzip')
  gzipHeaders.set('content-length', String(gzip.byteLength))
  const identityHeaders = new Headers(headers)
  identityHeaders.set('content-length', String(uncompressed.byteLength))

  return (request: Request) => {
    const encoding = parseAcceptEncoding(request.headers.get('accept-encoding'))
    if (encoding === 'br') return new Response(br, { headers: brHeaders })
    if (encoding === 'gzip') return new Response(gzip, { headers: gzipHeaders })
    if (encoding === 'not-acceptable') return new Response(null, { status: 406, headers })
    return new Response(uncompressed, { headers: identityHeaders })
  }
}

export async function pageRoutes(
  page: HTMLBundle,
  { publicUrl }: PageRouteOptions = {}
): Promise<Record<string, PageRoute>> {
  const banners = {
    '/favicon.ico': favicon,
    [SOCIAL_IMAGE_PATHS.light]: securedResponse(Bun.file(ogImagePath)),
    [SOCIAL_IMAGE_PATHS.dark]: securedResponse(Bun.file(ogImageDarkPath))
  }

  // The Claude Code plugin marketplace (#136) is one static document; like
  // the banners it is served in both route tables.
  const marketplace = securedResponse(JSON.stringify(claudeMarketplace), {
    'content-type': 'application/json'
  })

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
      '/plugins/marketplace.json': marketplace,
      ...banners
    }
  }

  const files = await bundledFiles(page)
  const html = files.find((file) => file.path.endsWith('.html'))
  if (!html) throw new Error("The page's bundled HTML file is missing")

  const staticRoutes = await Promise.all(
    files
      .filter((file) => file !== html)
      .map(async (file): Promise<[string, PageRoute]> => {
        const routePath = posix.join('/', file.path)
        if (isCompressibleText(file.path, file.headers['content-type'])) {
          return [routePath, await precomputeTextFileRoute(file)]
        }
        return [routePath, securedResponse(file.body, file.headers)]
      })
  )

  return {
    ...Object.fromEntries(staticRoutes),
    '/': async (request: Request) => {
      const publicOrigin = publicUrl ?? new URL(request.url).origin
      const uncompressedResponse = withSocialMeta(securedResponse(html.body, html.headers), publicOrigin)
      const uncompressedBytes = Buffer.from(await uncompressedResponse.arrayBuffer())

      const headers = varyByAcceptEncoding(uncompressedResponse.headers)
      headers.delete('content-length')

      const encoding = parseAcceptEncoding(request.headers.get('accept-encoding'))
      if (encoding === 'br') {
        const compressed = brotliCompressSync(uncompressedBytes, BROTLI_OPTIONS)
        headers.set('content-encoding', 'br')
        headers.set('content-length', String(compressed.byteLength))
        return new Response(compressed, { headers })
      }
      if (encoding === 'gzip') {
        const compressed = gzipSync(uncompressedBytes)
        headers.set('content-encoding', 'gzip')
        headers.set('content-length', String(compressed.byteLength))
        return new Response(compressed, { headers })
      }
      if (encoding === 'not-acceptable') return new Response(null, { status: 406, headers })
      headers.set('content-length', String(uncompressedBytes.byteLength))
      return new Response(uncompressedBytes, { headers })
    },
    '/plugins/marketplace.json': marketplace,
    ...banners
  }
}
