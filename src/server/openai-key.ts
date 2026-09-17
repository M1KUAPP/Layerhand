// A user's own OpenAI key, checked before anything is opened for it (#102).
// Listing models costs nothing and answers only for a key OpenAI accepts, so
// a mistyped or revoked key is turned away at the form, not after a browser
// has started billing for a run that could never call the model.

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

const MODELS_ENDPOINT = 'https://api.openai.com/v1/models'
// Inside NFR-3's five seconds for a run to start, so a slow answer cannot use them all.
const CHECK_TIMEOUT_MS = 4_000

/** `unchecked` is a check that OpenAI did not answer, which says nothing about the key. */
export type OpenAiKeyCheck = 'accepted' | 'refused' | 'unchecked'

export async function checkOpenAiKey(apiKey: string, fetchImplementation: Fetch = fetch): Promise<OpenAiKeyCheck> {
  let response: Response
  try {
    response = await fetchImplementation(MODELS_ENDPOINT, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
    })
  } catch {
    return 'unchecked'
  }
  // Only the status is wanted, not the list.
  await response.body?.cancel().catch(() => undefined)
  // A key OpenAI knows but that may not list models, as a restricted project
  // key can be, still passes: a run it cannot serve fails with its stated reason.
  if (response.ok || response.status === 403) return 'accepted'
  return response.status === 401 ? 'refused' : 'unchecked'
}
