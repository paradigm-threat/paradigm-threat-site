/** Vercel ops flags — set `NEXT_PUBLIC_*=1` in Production to enable. */

export function isSearchDisabled (): boolean {
  return process.env.NEXT_PUBLIC_SEARCH_DISABLED === '1'
}

export function isChatDisabled (): boolean {
  return process.env.NEXT_PUBLIC_CHAT_DISABLED === '1'
}

export function isSsrMirrorRedirectEnabled (): boolean {
  return process.env.NEXT_PUBLIC_SSR_MIRROR_REDIRECT === '1'
}
