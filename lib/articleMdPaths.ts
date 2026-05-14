/**
 * Ordered markdown paths to try for a site URL path (no leading slash).
 * Shared by SSR article fetch and client mirror fetch.
 */
export function buildArticleMdCandidatePaths (path: string): string[] {
  const normalized = path.replace(/^\//, '').replace(/\/$/, '')
  const out: string[] = []

  if (normalized.endsWith('.md') || normalized.endsWith('.mdx')) {
    out.push(normalized)
    return out
  }

  if (normalized) {
    out.push(`${normalized}.md`, `${normalized}.mdx`)
  }

  const base = normalized ? `${normalized}/` : ''
  out.push(`${base}page.md`, `${base}page.mdx`)
  return out
}
