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
