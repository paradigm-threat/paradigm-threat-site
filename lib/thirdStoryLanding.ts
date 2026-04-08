/**
 * thirdstory.site serves `/` rewritten to `/book` (see middleware).
 * Client uses this to avoid stacking TTS with the landing CTA.
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
