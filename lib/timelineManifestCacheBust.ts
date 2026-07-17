/**
 * 60-second URL bucket for cache-busting timeline / files asset URLs.
 * Aligns with FilesProvider so CDN / HTTP cache / Workbox are less likely
 * to serve stale manifests in the PWA.
 */
export function timelineManifestCacheQuery(): string {
  return `?v=${Math.floor(Date.now() / 60000)}`
}
