import matter from 'gray-matter'

export const CHAT_SCHEMA = 'paradigm.chat.v1'
export const CHAT_CONTENT_MAX = 1024
export const CHAT_USERNAME_MAX = 18

export type ChatCommentSource = 'web' | 'mcp' | 'webmcp'

export type ChatCommentFrontmatter = {
  schema: typeof CHAT_SCHEMA
  id: string
  channel: string
  author?: string
  anonymous: boolean
  created: string
  source: ChatCommentSource
  signed: boolean
}

export type ChatComment = ChatCommentFrontmatter & {
  content: string
  path?: string
}

export function serializeChatComment (comment: ChatComment): string {
  const fm: Record<string, unknown> = {
    schema: CHAT_SCHEMA,
    id: comment.id,
    channel: comment.channel,
    anonymous: comment.anonymous,
    created: comment.created,
    source: comment.source,
    signed: comment.signed,
  }
  if (!comment.anonymous && comment.author?.trim()) {
    fm.author = comment.author.trim()
  }
  return matter.stringify(comment.content.trim(), fm)
}

export function parseChatMarkdown (raw: string, path?: string): ChatComment | null {
  const parsed = matter(raw)
  const data = parsed.data as Record<string, unknown>
  if (data.schema !== CHAT_SCHEMA) return null
  const channel = typeof data.channel === 'string' ? data.channel : ''
  const id = typeof data.id === 'string' ? data.id : String(data.id ?? '')
  const createdRaw = data.created
  const created =
    typeof createdRaw === 'string'
      ? createdRaw
      : createdRaw instanceof Date
        ? createdRaw.toISOString()
        : createdRaw != null
          ? String(createdRaw)
          : ''
  if (!channel || !id || !created) return null
  const anonymous = data.anonymous !== false
  const author = typeof data.author === 'string' ? data.author : undefined
  const source = (typeof data.source === 'string' ? data.source : 'web') as ChatCommentSource
  return {
    schema: CHAT_SCHEMA,
    id,
    channel,
    author: anonymous ? undefined : author,
    anonymous,
    created,
    source,
    signed: data.signed === true,
    content: parsed.content.trim(),
    path,
  }
}

export function displayUsername (comment: ChatComment): string {
  if (comment.anonymous) return 'anonymous'
  return comment.author?.trim() || 'guest'
}
