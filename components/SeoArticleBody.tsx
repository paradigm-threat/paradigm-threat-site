/** Server-rendered semantic HTML for crawlers (no styles, no WASM). */
export function SeoArticleBody ({ html }: { html: string }) {
  return (
    <article
      className="seo-article mdx-content"
      data-seo-fallback="true"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
