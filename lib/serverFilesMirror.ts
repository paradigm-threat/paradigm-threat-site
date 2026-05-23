import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'
import {
  MIRROR_ARTICLE_REVALIDATE_SEC,
  mirrorFetchNext,
} from '@/lib/serverMirrorRevalidate'

function filesMirrorInit (vParam: string) {
  const bust = Boolean(vParam?.trim())
  return bust
    ? { search: vParam, cache: 'no-store' as const }
    : { search: vParam, next: mirrorFetchNext(MIRROR_ARTICLE_REVALIDATE_SEC) }
}

/** Try each files mirror until one returns body text for this path. */
export async function fetchFilesTextFromMirrors (
  relPath: string,
  vParam: string,
): Promise<string | null> {
  const path = '/' + relPath.replace(/^\//, '')
  const res = await fetchFromAssetMirrors('files', path, filesMirrorInit(vParam))
  if (!res) return null
  return await res.text()
}

/** Fetch static HTML for a markdown path (`Accept: text/html` on relay mirrors). */
export async function fetchFilesHtmlFromMirrors (
  relPath: string,
  vParam = '',
): Promise<string | null> {
  const path = '/' + relPath.replace(/^\//, '')
  const res = await fetchFromAssetMirrors('files', path, {
    ...filesMirrorInit(vParam),
    headers: { Accept: 'text/html' },
  })
  if (!res) return null
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.toLowerCase().includes('text/html')) return null
  const text = await res.text()
  return text.trim() ? text : null
}
