import type { MetadataRoute } from 'next'
import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'
import { CANONICAL_SITE_ORIGIN } from '@/lib/canonicalPublicSite'
import { isServerRelayFetchDisabled } from '@/lib/siteOpsFeature'
import {
  MIRROR_INDEX_REVALIDATE_SEC,
  mirrorFetchNext,
} from '@/lib/serverMirrorRevalidate'

/** Keep in sync with lib/edgeDocumentCache.ts */
export const revalidate = 86_400

const SITE = CANONICAL_SITE_ORIGIN.replace(/\/$/, '')

type IndexNode = Record<string, unknown>

function collectPaths (node: IndexNode, prefix: string, out: Set<string>): void {
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('_')) continue
    const path = prefix ? `${prefix}/${key}` : key
    if (val && typeof val === 'object' && '_count' in (val as IndexNode)) {
      out.add(path)
      collectPaths(val as IndexNode, path, out)
    } else if (val && typeof val === 'object') {
      if (/\.(md|mdx)$/i.test(key)) {
        out.add(path.replace(/\.(md|mdx)$/i, ''))
      } else {
        collectPaths(val as IndexNode, path, out)
      }
    }
  }
}

async function loadIndex (): Promise<IndexNode | null> {
  const res = await fetchFromAssetMirrors('files', '/index.json', {
    next: mirrorFetchNext(MIRROR_INDEX_REVALIDATE_SEC),
  })
  if (!res?.ok) return null
  try {
    return (await res.json()) as IndexNode
  } catch {
    return null
  }
}

function staticSitemapEntries (): MetadataRoute.Sitemap {
  const now = new Date()
  const routes = ['', '/timeline', '/search', '/blog']
  return routes.map((r) => ({
    url: r ? `${SITE}${r}` : SITE,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: r === '' ? 1 : 0.8,
  }))
}

export default async function sitemap (): Promise<MetadataRoute.Sitemap> {
  if (isServerRelayFetchDisabled()) {
    return staticSitemapEntries()
  }

  const index = await loadIndex()
  const paths = new Set<string>([''])
  if (index) collectPaths(index, '', paths)

  const staticRoutes = ['/timeline', '/search', '/blog']
  for (const r of staticRoutes) paths.add(r.replace(/^\//, ''))

  const entries: MetadataRoute.Sitemap = []
  const now = new Date()
  for (const p of Array.from(paths)) {
    entries.push({
      url: p ? `${SITE}/${p}` : SITE,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: p === '' ? 1 : 0.6,
    })
  }
  return entries
}
