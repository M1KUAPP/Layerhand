// The page and its link preview banners (#30). Bun serves the bundled page at
// PAGE_SHELL_PATH, and "/" fetches it from this same server to add the preview
// tags, whose URLs must be absolute and come from the public address.
import type { HTMLBundle } from 'bun'

import ogImageDarkPath from '../web/assets/og-image-dark.png'
import ogImagePath from '../web/assets/og-image.png'
import { SOCIAL_IMAGE_PATHS, withSocialMeta } from './social-meta'

export const PAGE_SHELL_PATH = '/page-shell'

export interface PageRouteOptions {
  /** The address link previews point at. The request's own origin unless set. */
  publicUrl?: string
  /** Where this server can reach itself, to fetch the bundled page. */
  selfOrigin(): string
}

export function pageRoutes(page: HTMLBundle, { publicUrl, selfOrigin }: PageRouteOptions) {
  return {
    [PAGE_SHELL_PATH]: page,
    '/': async (request: Request) => {
      const shell = await fetch(new URL(PAGE_SHELL_PATH, selfOrigin()))
      return withSocialMeta(shell, publicUrl ?? new URL(request.url).origin)
    },
    [SOCIAL_IMAGE_PATHS.light]: Bun.file(ogImagePath),
    [SOCIAL_IMAGE_PATHS.dark]: Bun.file(ogImageDarkPath)
  }
}
