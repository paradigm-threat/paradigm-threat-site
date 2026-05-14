import type { ShareExtractResult } from '@/lib/share'

export interface ShareLinksProps {
  url: string
  title: string
  /** @deprecated optional short line; prefer mdSource + shareExtract */
  description?: string
  /** Raw markdown body for TL;DR / first paragraph / long body */
  mdSource?: string
  /** Precomputed when SSR already ran extractShareMetadata */
  shareExtract?: ShareExtractResult
  ogImageUrl?: string
}
