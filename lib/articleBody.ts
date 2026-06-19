import { stripYamlFrontmatter } from '@/lib/stripYamlFrontmatter'

/** Normalize raw mirror markdown: strip YAML fences, autolink angle URLs for WASM. */
export function prepareArticleMarkdown (raw: string): string {
  const body = stripYamlFrontmatter(raw)
  return body.replace(/<(https?:\/\/[^>]+)>/g, (_, url) => `[${url}](${url})`)
}

/** First `#` heading in article body. */
export function extractFirstHeading (md: string): string | undefined {
  const m = md.match(/^#\s+(.+)$/m)
  return m ? m[1].trim().replace(/\s+#\s*$/, '').trim() : undefined
}

function humanizeSlug (segment: string): string {
  return segment.replace(/_/g, ' ').replace(/-/g, ' ').trim()
}

/**
 * Display title for an article: frontmatter → H1 → filename slug (or parent dir for page.md).
 */
export function resolveArticleDisplayTitle (
  targetPath: string,
  mdxSource: string,
  frontmatterTitle?: string | null
): string {
  const fromFrontmatter = frontmatterTitle?.trim()
  if (fromFrontmatter) return fromFrontmatter

  const heading = extractFirstHeading(mdxSource)
  if (heading) return heading

  const file = targetPath.split('/').pop() || ''
  if (/^page\.mdx?$/i.test(file)) {
    const parent = targetPath.split('/').filter(Boolean).slice(-2)[0]
    if (parent) {
      const human = humanizeSlug(parent)
      if (human) return human
    }
  }

  const fromFile = humanizeSlug(file.replace(/\.mdx?$/i, ''))
  return fromFile || 'Article'
}
