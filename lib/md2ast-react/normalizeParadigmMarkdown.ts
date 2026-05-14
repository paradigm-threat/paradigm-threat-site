/**
 * paradigm-threat-files convention: `![### Heading` without `](url)` is a mis-prefixed heading.
 * pulldown-cmark treats it as a broken image and swallows following paragraphs.
 */
export function normalizeParadigmMarkdown (source: string): string {
  return source.replace(/^!\[(#{1,6}\s[^\n]+)$/gm, '$1')
}
