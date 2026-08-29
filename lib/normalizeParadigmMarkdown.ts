/**
 * Shared markdown prep for SEO HTML and md2ast-react.
 *
 * - `![### Heading` without `](url)` is a mis-prefixed heading; pulldown-cmark
 *   treats it as a broken image and swallows following paragraphs.
 * - HTML comments must be stripped: md2ast cannot parse `<!-- … -->` as a tag
 *   and falls through to a **text** node, so markers like
 *   `<!-- popimage-portrait-sibling: … -->` leak into the article DOM and
 *   Android / browser Reading Mode.
 */
export function normalizeParadigmMarkdown (source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^!\[(#{1,6}\s[^\n]+)$/gm, '$1')
}
