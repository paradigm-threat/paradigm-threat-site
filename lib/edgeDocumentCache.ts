/** CDN + ISR TTL for article/document routes (must match route `revalidate` exports). */
export const EDGE_DOCUMENT_ISR_SEC = 86_400

export const EDGE_DOCUMENT_S_MAXAGE = EDGE_DOCUMENT_ISR_SEC
export const EDGE_DOCUMENT_STALE_WHILE_REVALIDATE = 604_800

export function edgeDocumentCacheControlHeader (): string {
  return `public, s-maxage=${EDGE_DOCUMENT_S_MAXAGE}, stale-while-revalidate=${EDGE_DOCUMENT_STALE_WHILE_REVALIDATE}`
}
