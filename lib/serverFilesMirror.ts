import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'

/** Try each files mirror until one returns body text for this path. */
export async function fetchFilesTextFromMirrors (
  relPath: string,
  vParam: string,
): Promise<string | null> {
  const path = '/' + relPath.replace(/^\//, '')
  const res = await fetchFromAssetMirrors('files', path, { search: vParam })
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
    search: vParam,
    headers: { Accept: 'text/html' },
  })
  if (!res) return null
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.toLowerCase().includes('text/html')) return null
  const text = await res.text()
  return text.trim() ? text : null
}
