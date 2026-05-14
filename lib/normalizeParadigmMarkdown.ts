/** @see @clevertree/relay-markdown normalizeParadigmMarkdown — kept in sync for server SEO path */
export function normalizeParadigmMarkdown (source: string): string {
  return source.replace(/^!\[(#{1,6}\s[^\n]+)$/gm, '$1')
}
