import { buildArticleMdCandidatePaths } from '@/lib/articleMdPaths'
import { isRelayRepoNotFoundJson } from '@/lib/relayRepoError'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'

export type FilesRepoMdResult = { text: string; relPath: string }

/**
 * Fetch markdown from the files mirror, skipping Relay JSON `not_found` bodies (HTTP 200).
 * Candidate order matches {@link buildArticleMdCandidatePaths}.
 */
export async function fetchFilesRepoMarkdown (
  logicalPath: string,
  filesBaseUrl = getPrimaryFilesBaseUrl(),
): Promise<FilesRepoMdResult | null> {
  const base = filesBaseUrl.replace(/\/$/, '')
  for (const relPath of buildArticleMdCandidatePaths(logicalPath)) {
    const res = await fetch(`${base}/${relPath}`, { cache: 'no-store' })
    if (!res.ok) continue
    const text = await res.text()
    if (isRelayRepoNotFoundJson(text)) continue
    return { text, relPath }
  }
  return null
}
