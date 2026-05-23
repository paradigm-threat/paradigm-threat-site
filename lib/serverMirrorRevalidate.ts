/** ISR / `fetch` revalidate seconds for Relay mirror reads on the server. */

/** Article markdown, changelog, index walks, most files-repo assets. */
export const MIRROR_ARTICLE_REVALIDATE_SEC = 300

/** Timeline events.json and derived metadata. */
export const MIRROR_TIMELINE_EVENTS_REVALIDATE_SEC = 120

/** Large index.json for sitemap / search index build. */
export const MIRROR_INDEX_REVALIDATE_SEC = 600

export function mirrorFetchNext (
  revalidateSec: number,
): { revalidate: number } {
  return { revalidate: revalidateSec }
}
