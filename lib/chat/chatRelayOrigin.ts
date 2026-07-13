import { getFilesBaseUrlList, parseUrlList } from '@/lib/urlListEnv'

export const CHAT_RELAY_BRANCH = 'chat/public'
const SITE_REPO_HOST_PREFIX = 'paradigm-threat-site'

function normalizeOrigin (s: string): string {
  return s.trim().replace(/\/+$/, '')
}

/**
 * Chat uses the paradigm-threat-site mirror host + `X-Relay-Branch: chat/public`.
 * (`repo--branch-slug` Host labels are documented but not yet implemented on gateway GET/QUERY.)
 */
export function chatRelayOriginFromFilesOrigin (filesOrigin: string): string {
  try {
    const u = new URL(filesOrigin)
    const host = u.hostname.replace(/^paradigm-threat-files\./i, `${SITE_REPO_HOST_PREFIX}.`)
    return `${u.protocol}//${host}`
  } catch {
    return ''
  }
}

export function getChatRelayOriginList (): string[] {
  const explicit = parseUrlList(process.env.NEXT_PUBLIC_CHAT_RELAY_ORIGIN)
  if (explicit.length > 0) return explicit
  const fromFiles = getFilesBaseUrlList()
    .map(chatRelayOriginFromFilesOrigin)
    .filter(Boolean)
  return fromFiles.length > 0 ? fromFiles : []
}

export function getPrimaryChatRelayOrigin (): string {
  return getChatRelayOriginList()[0] || ''
}
