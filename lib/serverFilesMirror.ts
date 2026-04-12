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
