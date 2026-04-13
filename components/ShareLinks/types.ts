import type { ShareExtractResult } from '@/lib/share'

export interface ShareLinksProps {
  url: string
  title: string
  /** @deprecated optional short line; prefer mdSource + frontmatter for rich share */
  description?: string
  /** Raw markdown body (no YAML) for TL;DR / first paragraph / long body */
  mdSource?: string
  frontmatter?: Record<string, unknown>
  /** Precomputed when SSR already ran extractShareMetadata */
  shareExtract?: ShareExtractResult
  ogImageUrl?: string
}
