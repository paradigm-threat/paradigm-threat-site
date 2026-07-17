/**
 * Walk a nested Relay files catalog tree (`rebuildFilesCatalogTree` shape) to a leaf.
 * Directory nodes carry `_count`; file leaves do not.
 */
export function catalogLeafAtPath (
  root: Record<string, unknown> | null | undefined,
  mdPath: string,
): Record<string, unknown> | null {
  if (!root || !mdPath.trim()) return null
  const parts = mdPath.split('/').filter(Boolean)
  if (parts.length === 0) return null
  let cur: unknown = root
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return null
    cur = (cur as Record<string, unknown>)[part]
  }
  if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return null
  const leaf = cur as Record<string, unknown>
  if ('_count' in leaf) return null
  return leaf
}

/** Native `title` tooltip text for a full git hash, or null if unusable. */
export function shortCommitTitle (commit: unknown): string | null {
  if (typeof commit !== 'string') return null
  const trimmed = commit.trim()
  if (!trimmed) return null
  const short = trimmed.length >= 7 ? trimmed.slice(0, 7) : trimmed
  return `Commit ${short}`
}
