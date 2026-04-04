import { getTimelineBaseUrlList, parseUrlList } from '@/lib/urlListEnv'

/**
 * Ordered timeline static-site origins (GitLab Pages, etc.), no trailing slashes.
 * Used by `/export` proxy and anywhere we need fallbacks.
 *
 * Set `TIMELINE_ORIGINS` to a whitespace-separated list to try in order.
 * If unset, uses `NEXT_PUBLIC_TIMELINE_BASE_URL` (supports multiple URLs separated by spaces).
 */
export function getTimelineOrigins(): string[] {
  const fromEnv = parseUrlList(process.env.TIMELINE_ORIGINS)
  if (fromEnv.length > 0) return fromEnv
  return getTimelineBaseUrlList()
}
