import type { Viewport } from './session'

interface PhotopeaEnvironmentParameters {
  readonly guides: boolean
  readonly grid: boolean
  readonly paths: boolean
  readonly pgrid: boolean
}

interface PhotopeaEnvironment {
  readonly theme: number
  readonly lang: string
  readonly vmode: number
  readonly intro: boolean
  readonly localsave: boolean
  readonly eparams: PhotopeaEnvironmentParameters
  readonly panels: readonly number[]
}

export interface PhotopeaConfiguration {
  readonly environment: PhotopeaEnvironment
}

export const PHOTOPEA_ORIGIN = 'https://www.photopea.com'
// Photopea serves the editor shell from its primary origin and its versioned
// CSS and JavaScript bundles from this separate first-party asset origin.
export const PHOTOPEA_ASSET_ORIGIN = 'https://vecpea.com'

export const PHOTOPEA_CONFIGURATION = {
  environment: {
    theme: 0,
    lang: 'en',
    vmode: 0,
    intro: false,
    localsave: false,
    eparams: {
      guides: false,
      grid: false,
      paths: false,
      pgrid: false
    },
    panels: [2, 5, 18]
  }
} as const satisfies PhotopeaConfiguration

export type PhotopeaMessage =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'bytes'; readonly value: Uint8Array }

export interface PhotopeaTransport {
  readonly viewport: Viewport
  boot(configuration: PhotopeaConfiguration): Promise<void>
  send(message: string | Uint8Array): Promise<void>
  nextMessage(timeoutMs: number): Promise<PhotopeaMessage>
  press(key: string): Promise<void>
  reload(): Promise<void>
}
