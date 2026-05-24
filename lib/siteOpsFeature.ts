/** Vercel ops flags — set `NEXT_PUBLIC_*=1` in Production to enable. */

/** Blocks /api/search-index and /api/feeling-lucky only (not the /search UI). */
export function isSearchServerApiDisabled (): boolean {
  return process.env.NEXT_PUBLIC_SEARCH_DISABLED === '1'
}

/** @deprecated Use isSearchServerApiDisabled for APIs; search UI is always client-side. */
export function isSearchDisabled (): boolean {
  return isSearchServerApiDisabled()
}

export function isChatDisabled (): boolean {
  return process.env.NEXT_PUBLIC_CHAT_DISABLED === '1'
}

/**
 * Reserved for a future Relay-hosted HTML + SEO phase. Must stay off while articles
 * use the Next app shell — redirecting to mirror md2ast HTML breaks client components.
 */
export function isSsrMirrorRedirectEnabled (): boolean {
  return false
}
