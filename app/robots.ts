import type { MetadataRoute } from 'next'
import { CANONICAL_SITE_ORIGIN } from '@/lib/canonicalPublicSite'

export default function robots (): MetadataRoute.Robots {
  const site = CANONICAL_SITE_ORIGIN.replace(/\/$/, '')
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/docs/'],
    },
    sitemap: `${site}/sitemap.xml`,
  }
}
