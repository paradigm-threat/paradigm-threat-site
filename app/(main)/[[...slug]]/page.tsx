import React from 'react'
import { redirect } from 'next/navigation'
import { extractShareMetadata } from '@/lib/share'
import { fetchArticle, fetchTextLeaf } from '@/lib/articleServer'
import { relPathFromCanonicalSiteUrl } from '@/lib/canonicalSiteAssetUrl'
import { shouldRedirectPathToMirrorAsset } from '@/lib/isNonArticlePath'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { buildArticleSeoHtml } from '@/lib/seo/buildArticleSeoHtml'
import { ArticleMarkdownRegion } from '@/components/ArticleMarkdownRegion'
import { ArticleJsonLd } from '@/components/ArticleJsonLd'
import { ArticleClientShell } from '@/components/ArticleClientShell'
import { TextLeafClientShell } from '@/components/TextLeafClientShell'
import { ClientCatchAllShell } from './ClientCatchAllShell'
import { isServerRelayFetchDisabled } from '@/lib/siteOpsFeature'
import type { Metadata } from 'next'

/** ISR for the client-loaded article shell — cuts uncached Vercel edge document hits. */
export const revalidate = 86_400

/** Allow runtime slug generation; pair with empty generateStaticParams for on-demand ISR. */
export const dynamicParams = true

/** No article paths at build — each slug is generated on first request then cached 24h. */
export async function generateStaticParams (): Promise<{ slug?: string[] }[]> {
  return []
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://paradigmthreat.net'

/** Keep OG/meta description readable in link previews (first para can be very long). */
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

interface PageProps {
  params: Promise<{ slug?: string | string[] }>
}

function getPathFromParams (params: { slug?: string | string[] }): string {
  if (!params.slug) return ''
  const slug = params.slug
  return Array.isArray(slug) ? slug.join('/') : slug
}

export async function generateMetadata ({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const path = getPathFromParams(resolved)

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

export default async function CatchAllPage ({ params }: PageProps) {
  const resolved = await params
  const path = getPathFromParams(resolved)

  if (shouldRedirectPathToMirrorAsset(path)) {
    const rel = relPathFromCanonicalSiteUrl(`/${path}`)
    if (rel) redirect(buildOptimizedAssetUrl(`/${rel}`))
  }

  if (isServerRelayFetchDisabled()) {
    return <ClientCatchAllShell />
  }

  const article = await fetchArticle(path)

  if (article) {
    const shareExtract = extractShareMetadata({
      rawMarkdown: article.mdxSource,
    })
    const description = shareExtract.snippetPlain.trim() || undefined
    const seoHtml = await buildArticleSeoHtml({
      markdownBody: article.mdxSource,
      basePath: article.basePath,
      articlePath: article.targetPath,
    })
    return (
      <ArticleClientShell
        articleTitle={article.title}
        articleContent={article.mdxSource}
        basePath={article.basePath}
        articlePath={path}
        articleDescription={description}
        ogImageUrl={article.ogImageUrl}
        shareExtract={shareExtract}
      >
        <ArticleJsonLd
          title={article.title}
          description={description}
          articlePath={path}
          imageUrl={article.ogImageUrl}
        />
        <ArticleMarkdownRegion
          seoHtml={seoHtml}
          content={article.mdxSource}
          basePath={article.basePath}
          sourcePath={path}
        />
      </ArticleClientShell>
    )
  }

  const textLeaf = path ? await fetchTextLeaf(path) : null
  if (textLeaf) {
    return (
      <TextLeafClientShell articlePath={path} title={textLeaf.title} body={textLeaf.text} />
    )
  }

  return <ClientCatchAllShell />
}
