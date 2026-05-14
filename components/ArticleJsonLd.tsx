import { CANONICAL_SITE_ORIGIN } from '@/lib/canonicalPublicSite'
import { resolveSeoPageUrl } from '@/lib/seo/resolveSeoAssetUrl'

export interface ArticleJsonLdProps {
  title: string
  description?: string
  articlePath: string
  imageUrl?: string
}

export function ArticleJsonLd ({ title, description, articlePath, imageUrl }: ArticleJsonLdProps) {
  const url = resolveSeoPageUrl(articlePath)
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    ...(description ? { description } : {}),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    publisher: {
      '@type': 'Organization',
      name: 'Paradigm Threat',
      url: CANONICAL_SITE_ORIGIN,
    },
    ...(imageUrl ? { image: [imageUrl] } : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
