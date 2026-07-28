import { fetchArticle, fetchTextLeaf } from '@/lib/articleServer'
import { extractShareMetadata } from '@/lib/share'
import { isServerRelayFetchDisabled } from '@/lib/siteOpsFeature'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://paradigmthreat.net'

const OG_DESCRIPTION_MAX = 320

function truncateForOgDescription (plain: string): string {
  const t = plain.trim()
  if (t.length <= OG_DESCRIPTION_MAX) return t
  const cut = t.slice(0, OG_DESCRIPTION_MAX - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + '…'
}

function firstNonEmptyLine (plain: string): string {
  const line = plain.trim().split(/\r?\n/).find((l) => l.trim()) || ''
  return line.trim()
}

function staticMetadataForPath (path: string): Metadata {
  const label = path
    ? path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ?? 'Paradigm Threat'
    : 'Paradigm Threat'
  const title = path ? `${label} | Paradigm Threat` : 'Paradigm Threat'
  const canonicalUrl = path
    ? `${SITE_URL.replace(/\/$/, '')}/${path}`
    : SITE_URL.replace(/\/$/, '')
  const description =
    'Alternate history, chronology, and investigation — Paradigm Threat (client-loaded from Relay during migration).'
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Paradigm Threat',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

function getPathFromParams (params: { slug?: string | string[] }): string {
  if (!params.slug) return ''
  const slug = params.slug
  return Array.isArray(slug) ? slug.join('/') : slug
}

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug?: string | string[] }>
}

function isRobotsDisallowedPath (path: string): boolean {
  const first = path.split('/').filter(Boolean)[0] ?? ''
  return first === 'docs' || first === 'api'
}

export async function generateMetadata ({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const resolved = await params
  const path = getPathFromParams(resolved)

  // Keep Search Console clean: paths Disallow'd in robots.txt must also be noindex.
  if (isRobotsDisallowedPath(path)) {
    const label = path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ?? path
    return {
      title: `${label} | Paradigm Threat`,
      robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    }
  }

  if (isServerRelayFetchDisabled()) {
    return staticMetadataForPath(path)
  }

  const article = await fetchArticle(path)
  if (article) {
    const title = `${article.title} | Paradigm Threat`
    const shareExtract = extractShareMetadata({
      rawMarkdown: article.mdxSource,
    })
    const descriptionPlain =
      shareExtract.snippetPlain.trim() || `Read ${article.title} on Paradigm Threat`
    const description = truncateForOgDescription(descriptionPlain)
    const canonicalUrl = path
      ? `${SITE_URL.replace(/\/$/, '')}/${path}`
      : SITE_URL.replace(/\/$/, '')

    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: 'Paradigm Threat',
        ...(article.ogImageUrl && { images: [{ url: article.ogImageUrl }] }),
      },
      twitter: {
        card: article.ogImageUrl ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(article.ogImageUrl && { images: [article.ogImageUrl] }),
      },
    }
  }

  const textLeaf = await fetchTextLeaf(path)
  if (textLeaf) {
    const title = `${textLeaf.title} | Paradigm Threat`
    const descriptionPlain =
      firstNonEmptyLine(textLeaf.text) || `Read ${textLeaf.title} on Paradigm Threat`
    const description = truncateForOgDescription(descriptionPlain)
    const canonicalUrl = path
      ? `${SITE_URL.replace(/\/$/, '')}/${path}`
      : SITE_URL.replace(/\/$/, '')
    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: 'Paradigm Threat',
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    }
  }

  return { title: 'Paradigm Threat' }
}

export default function SlugLayout ({ children }: LayoutProps) {
  return children
}
