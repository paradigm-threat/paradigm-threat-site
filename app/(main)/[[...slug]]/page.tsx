import React, { Suspense } from 'react'
import { extractShareMetadata } from '@/lib/share'
import { fetchArticle } from '@/lib/articleServer'
import { ArticleContentSSR } from '@/components/ArticleContentSSR'
import { ArticleClientShell } from '@/components/ArticleClientShell'
import { CatchAllClient } from './CatchAllClient'
import { SuspenseLoader } from '@client'
import type { Metadata } from 'next'

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
  if (!path) return { title: 'Paradigm Threat' }

  const article = await fetchArticle(path)
  if (!article) return { title: 'Paradigm Threat' }

  const title = `${article.title} | Paradigm Threat`
  const shareExtract = extractShareMetadata({
    rawMarkdown: article.mdxSource,
    frontmatter: article.frontmatter,
  })
  const descriptionPlain =
    shareExtract.snippetPlain.trim() || `Read ${article.title} on Paradigm Threat`
  const description = truncateForOgDescription(descriptionPlain)
  const canonicalUrl = `${SITE_URL.replace(/\/$/, '')}/${path}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Paradigm Threat',
      ...(article.ogImageUrl && { images: [{ url: article.ogImageUrl }] })
    },
    twitter: {
      card: article.ogImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(article.ogImageUrl && { images: [article.ogImageUrl] })
    }
  }
}

export default async function CatchAllPage ({ params }: PageProps) {
  const resolved = await params
  const path = getPathFromParams(resolved)

  // Try to fetch article server-side for SSR (crawlers get full HTML)
  const article = path ? await fetchArticle(path) : null

  if (article) {
    const shareExtract = extractShareMetadata({
      rawMarkdown: article.mdxSource,
      frontmatter: article.frontmatter,
    })
    const description = shareExtract.snippetPlain.trim() || undefined
    return (
      <ArticleClientShell
        articleTitle={article.title}
        articleContent={article.mdxSource}
        basePath={article.basePath}
        articlePath={path}
        articleDescription={description}
        articleFrontmatter={article.frontmatter}
        ogImageUrl={article.ogImageUrl}
        shareExtract={shareExtract}
      >
        <Suspense fallback={<div className="animate-pulse h-32 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl" />}>
          <ArticleContentSSR
            mdxSource={article.mdxSource}
            basePath={article.basePath}
            sourcePath={path}
          />
        </Suspense>
      </ArticleClientShell>
    )
  }

  // Directory listing or 404: use client-side logic (requires fileList)
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><SuspenseLoader /></div>}>
      <CatchAllClient />
    </Suspense>
  )
}
