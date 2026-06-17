/**
 * thirdstory.site: `/` redirects to `/timeline?fullscreen=1` (see next.config.js redirects).
 * Client uses this to avoid stacking TTS with the book landing CTA on `/book`.
 */
export const THIRD_STORY_LANDING_HOSTS = new Set(['thirdstory.site', 'www.thirdstory.site'])

export function isThirdStoryLandingHostname(host: string | null | undefined): boolean {
  if (!host) return false
  const h = host.split(':')[0]?.toLowerCase() ?? ''
  return THIRD_STORY_LANDING_HOSTS.has(h)
}

export function isThirdStoryLandingHost(): boolean {
  if (typeof window === 'undefined') return false
  return isThirdStoryLandingHostname(window.location.hostname)
}
