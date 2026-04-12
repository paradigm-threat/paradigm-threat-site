/**
 * Paths eligible for "I'm Feeling Lucky" — markdown articles from files + timeline event pages.
 */

export function isFeelingLuckyCandidate (path: string): boolean {
  if (path.startsWith('timeline/')) {
    const rest = path.slice('timeline/'.length)
    return rest.length > 0 && !rest.includes('/')
  }
  if (!/\.(md|mdx)$/i.test(path)) return false
  if (/\.auto\.md$/i.test(path)) return false
  return true
}

/** Site path: `/blog/foo` or `/timeline/evt-…` */
export function feelingLuckyPathToHref (path: string): string {
  if (path.startsWith('timeline/')) return `/${path}`
  return `/${path.replace(/\.(md|mdx)$/i, '')}`
}
