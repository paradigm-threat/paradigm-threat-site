import type { MetadataRoute } from 'next'
import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'
import { CANONICAL_SITE_ORIGIN } from '@/lib/canonicalPublicSite'

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
  const res = await fetchFromAssetMirrors('files', '/index.json', { cache: 'no-store' })
  if (!res?.ok) return null
  try {
    return (await res.json()) as IndexNode
  } catch {
    return null
  }
}

export default async function sitemap (): Promise<MetadataRoute.Sitemap> {
  const index = await loadIndex()
  const paths = new Set<string>([''])
  if (index) collectPaths(index, '', paths)

  const staticRoutes = ['/timeline', '/search', '/blog']
  for (const r of staticRoutes) paths.add(r.replace(/^\//, ''))

  const entries: MetadataRoute.Sitemap = []
  for (const p of Array.from(paths)) {
    const loc = p ? `${SITE}/${p}` : SITE
    entries.push({
      url: loc,
      changeFrequency: 'weekly',
      priority: p === '' ? 1 : 0.6,
    })
  }

  return entries
}
