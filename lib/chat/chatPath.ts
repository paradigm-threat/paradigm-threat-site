/** Relay comment path helpers — mirrors gateway `encode_comment_target_path`. */

export const CHAT_CHANNELS_ROOT = '.relay/chat/channels/'
export const CHAT_CHANNELS_JSON = '.relay/chat/channels.json'
export const CHAT_BRANCH_SLUG = 'chat-public'
export const CHAT_REPO_LABEL = 'paradigm-threat-site'

/** Percent-encode channel name for repo-relative paths (e.g. `cosmos/mars` → `cosmos%2Fmars`). */
export function encodeChatChannel (channel: string): string {
  const trimmed = channel.trim().replace(/^\/+/, '')
  return encodeURIComponent(trimmed)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`)
}

export function channelPathPrefix (channel: string): string {
  return `${CHAT_CHANNELS_ROOT}${encodeChatChannel(channel)}/`
}

/** ISO8601 compact for filename sort (UTC). */
export function compactIsoTimestamp (date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

export function newCommentId (): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 26).toUpperCase()
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase()
}

export function commentFilePath (
  channel: string,
  created: Date,
  legacyId: string | number = 0,
  ulid = newCommentId(),
): string {
  const ts = compactIsoTimestamp(created)
  const idPart = String(legacyId).padStart(8, '0')
  return `${channelPathPrefix(channel)}${ts}_${idPart}_${ulid}.md`
}
