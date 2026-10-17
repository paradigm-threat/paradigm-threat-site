/** Legacy ChatRoom channel → mesh key without leading # (matches park ChatRoomLive). */
export function meshChannelFromChatRoom (raw?: string): string {
  let s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9_\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  if (!s || s === 'general') return 'pt-general'
  if (s.startsWith('pt-')) {
    const rest = s.slice(3).replace(/-+/g, '-').replace(/^-|-$/g, '')
    return rest ? `pt-${rest}` : 'pt-general'
  }
  return `pt-${s}`
}
