import { redirect } from 'next/navigation'
import { fetchArticle, fetchTextLeaf } from '@/lib/articleServer'
import { relPathFromCanonicalSiteUrl } from '@/lib/canonicalSiteAssetUrl'
import { shouldRedirectPathToMirrorAsset } from '@/lib/isNonArticlePath'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { buildArticleSeoHtml } from '@/lib/seo/buildArticleSeoHtml'
import { extractShareMetadata } from '@/lib/share'
import { ArticleMarkdownRegion } from '@/components/ArticleMarkdownRegion'
import { ArticleJsonLd } from '@/components/ArticleJsonLd'
import { ArticleClientShell } from '@/components/ArticleClientShell'
import { TextLeafClientShell } from '@/components/TextLeafClientShell'
import { ClientCatchAllShell } from '@/components/content/ClientCatchAllShell'

interface SsrCatchAllPageProps {
  params?: Promise<{ slug?: string | string[] }>
}

function getPathFromParams (params: { slug?: string | string[] }): string {
  if (!params.slug) return ''
  const slug = params.slug
  return Array.isArray(slug) ? slug.join('/') : slug
}

/** Server Relay fetch path — only when NEXT_PUBLIC_SERVER_RELAY_FETCH=1. */
export async function SsrCatchAllPage ({ params }: SsrCatchAllPageProps) {
  const resolved = params ? await params : { slug: undefined }
  const path = getPathFromParams(resolved)

  if (shouldRedirectPathToMirrorAsset(path)) {
    const rel = relPathFromCanonicalSiteUrl(`/${path}`)
    if (rel) redirect(buildOptimizedAssetUrl(`/${rel}`))
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
        articleMdPath={article.targetPath}
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
