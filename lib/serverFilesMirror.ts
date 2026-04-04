import { getFilesBaseUrlList } from '@/lib/urlListEnv'

const FETCH_TIMEOUT_MS = 20_000

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  }
}

/** Try each mirror until one returns body text for this path. */
export async function fetchFilesTextFromMirrors(
  relPath: string,
  vParam: string,
): Promise<string | null> {
  const bases = getFilesBaseUrlList()
  const path = relPath.replace(/^\//, '')
  for (const base of bases) {
    const url = `${base.replace(/\/$/, '')}/${path}${vParam}`
    const text = await fetchText(url)
    if (text != null) return text
  }
  return null
}
