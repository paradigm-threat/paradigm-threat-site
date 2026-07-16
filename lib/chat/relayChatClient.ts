/**
 * Pure Relay chat client — QUERY reads + PUT writes on `chat/public` branch host.
 *
 * Message bodies come from the chat search plugin (`chat_comments`); the browser
 * does not issue one CORS-preflighted GET per comment.
 */

import { queryRelayOrigin } from '@/lib/relayQuery'
import {
  CHAT_CHANNELS_JSON,
  CHAT_CHANNELS_ROOT,
  commentFilePath,
  newCommentId,
} from '@/lib/chat/chatPath'
import { CHAT_RELAY_BRANCH, getChatRelayOriginList } from '@/lib/chat/chatRelayOrigin'
import {
  CHAT_SCHEMA,
  displayUsername,
  serializeChatComment,
  type ChatComment,
  type ChatCommentSource,
} from '@/lib/chat/chatMarkdown'

const FETCH_TIMEOUT_MS = 60_000

export type ChatLoadStage =
  | 'connecting'
  | 'listing'
  | 'fetching'
  | 'done'

export type ChatLoadProgress = {
  stage: ChatLoadStage
  detail: string
  loaded?: number
  total?: number
}

export type ChatLoadOptions = {
  onProgress?: (p: ChatLoadProgress) => void
}

export type ChatChannelInfo = {
  id: number
  name: string
  description: string
}

export type ChatPostEntry = {
  id: string
  channel: string
  channel_name: string
  username: string
  created: string
  content: string
  author?: string
  anonymous: boolean
  path: string
}

export type ChatUserProfile = {
  user: { username: string }
  recentPosts: Array<{
    id: string
    channel_name: string
    created: string
    content: string
  }>
}

type ChannelsJson = {
  channels?: Array<{ name: string; description?: string }>
}

let recentCache: { at: number; posts: ChatPostEntry[] } | null = null
const RECENT_CACHE_MS = 30_000

function chatPostFromComment (c: ChatComment): ChatPostEntry {
  return {
    id: c.id,
    channel: c.channel,
    channel_name: c.channel,
    username: displayUsername(c),
    created: c.created,
    content: c.content,
    author: c.author,
    anonymous: c.anonymous,
    path: c.path || '',
  }
}

function chatRelayHeaders (extra?: HeadersInit): Headers {
  const h = new Headers(extra)
  h.set('X-Relay-Branch', CHAT_RELAY_BRANCH)
  return h
}

function report (opts: ChatLoadOptions | undefined, progress: ChatLoadProgress): void {
  opts?.onProgress?.(progress)
}

async function fetchWithTimeout (url: string, init?: RequestInit): Promise<Response> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  const headers = chatRelayHeaders(init?.headers)
  return fetch(url, { ...init, headers, signal, cache: 'no-store' })
}

async function withChatOrigins<T> (
  fn: (origin: string) => Promise<T | null>,
  opts?: ChatLoadOptions,
): Promise<T> {
  const origins = getChatRelayOriginList()
  if (!origins.length) {
    throw new Error('Chat Relay origin not configured (set NEXT_PUBLIC_CHAT_RELAY_ORIGIN or NEXT_PUBLIC_FILES_BASE_URL)')
  }
  report(opts, {
    stage: 'connecting',
    detail: `Connecting to Relay (${origins.length} host${origins.length === 1 ? '' : 's'})…`,
  })
  let lastErr: unknown
  for (let i = 0; i < origins.length; i++) {
    const origin = origins[i]
    try {
      if (i > 0) {
        report(opts, {
          stage: 'connecting',
          detail: `Trying failover host ${i + 1}/${origins.length}…`,
        })
      }
      const result = await fn(origin)
      if (result != null) return result
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Chat Relay unavailable')
}

async function relayGetText (origin: string, path: string): Promise<string | null> {
  const base = origin.replace(/\/$/, '') + '/'
  const url = new URL(path.replace(/^\//, ''), base).toString()
  const res = await fetchWithTimeout(url)
  if (!res.ok) return null
  return res.text()
}

async function relayPutText (origin: string, path: string, body: string): Promise<{ commit?: string }> {
  const base = origin.replace(/\/$/, '') + '/'
  const url = new URL(path.replace(/^\//, ''), base).toString()
  const res = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Chat PUT failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<{ commit?: string }>
}

/** FTS terms from channel name (`cosmos/mars` → `cosmos mars`). Kept for tests / free-text search. */
export function channelFtsQuery (channel: string): string {
  return channel
    .trim()
    .split(/[/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(' ')
}

function strField (row: Record<string, unknown>, key: string): string {
  const v = row[key]
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

/** Hydrate a chat comment from an indexed QUERY row (body + frontmatter fields). */
export function commentFromQueryRow (
  row: Record<string, unknown>,
): ChatComment | null {
  const path = strField(row, 'path')
  if (!path.startsWith(CHAT_CHANNELS_ROOT) || !path.endsWith('.md')) return null
  const schema = strField(row, 'schema') || CHAT_SCHEMA
  if (schema !== CHAT_SCHEMA) return null
  const body = strField(row, 'body')
  if (!body) return null
  const channel = strField(row, 'channel')
  const id = strField(row, 'id')
  const created = strField(row, 'created')
  if (!channel || !id || !created) return null
  const anonymous = row.anonymous !== false
  const author = typeof row.author === 'string' ? row.author : undefined
  const source = (strField(row, 'source') || 'web') as ChatCommentSource
  return {
    schema: CHAT_SCHEMA,
    id,
    channel,
    author: anonymous ? undefined : author,
    anonymous,
    created,
    source,
    signed: row.signed === true,
    content: body.trim(),
    path,
  }
}

function sortCommentsDesc (comments: ChatComment[]): ChatComment[] {
  return [...comments].sort((a, b) => {
    const byCreated = b.created.localeCompare(a.created)
    if (byCreated !== 0) return byCreated
    return (b.path || '').localeCompare(a.path || '')
  })
}

async function queryChatRows (
  origin: string,
  query: string | Record<string, unknown>,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const env = await queryRelayOrigin(origin, {
    collection: 'chat',
    query,
    limit,
    branch: CHAT_RELAY_BRANCH,
  })
  return env.results
}

export function resetChatRelayCaches (): void {
  recentCache = null
}

export async function queryChannels (opts?: ChatLoadOptions): Promise<ChatChannelInfo[]> {
  return withChatOrigins(async (origin) => {
    report(opts, { stage: 'listing', detail: 'Loading channel list…' })
    const raw = await relayGetText(origin, CHAT_CHANNELS_JSON)
    if (!raw) return null
    const data = JSON.parse(raw) as ChannelsJson
    const channels = data.channels ?? []
    report(opts, {
      stage: 'done',
      detail: `Loaded ${channels.length} channels.`,
    })
    return channels.map((c, i) => ({
      id: i + 1,
      name: c.name,
      description: c.description ?? '',
    }))
  }, opts)
}

export async function queryPosts (
  channel: string,
  limit = 50,
  opts?: ChatLoadOptions,
): Promise<{ channel: string; posts: ChatPostEntry[] }> {
  return withChatOrigins(async (origin) => {
    report(opts, {
      stage: 'listing',
      detail: `Querying index for #${channel}…`,
    })
    const rows = await queryChatRows(origin, { channel }, limit)
    report(opts, {
      stage: 'fetching',
      detail: 'Hydrating messages from index…',
      loaded: 0,
      total: rows.length,
    })
    const comments = sortCommentsDesc(
      rows.map(commentFromQueryRow).filter((c): c is ChatComment => c != null),
    ).slice(0, limit)
    report(opts, {
      stage: 'done',
      detail: `Loaded ${comments.length} message${comments.length === 1 ? '' : 's'}.`,
      loaded: comments.length,
      total: comments.length,
    })
    return {
      channel,
      posts: comments.map(chatPostFromComment),
    }
  }, opts)
}

export async function queryRecentPosts (
  limit = 50,
  opts?: ChatLoadOptions,
): Promise<{ posts: ChatPostEntry[] }> {
  return withChatOrigins(async (origin) => {
    const now = Date.now()
    if (recentCache && now - recentCache.at < RECENT_CACHE_MS) {
      report(opts, { stage: 'listing', detail: 'Using cached recent posts…' })
      return { posts: recentCache.posts.slice(0, limit) }
    }
    report(opts, {
      stage: 'listing',
      detail: 'Querying recent chat index…',
    })
    const rows = await queryChatRows(origin, '', limit)
    const comments = sortCommentsDesc(
      rows.map(commentFromQueryRow).filter((c): c is ChatComment => c != null),
    )
    const posts = comments.slice(0, limit).map(chatPostFromComment)
    recentCache = { at: now, posts }
    report(opts, {
      stage: 'done',
      detail: `Loaded ${posts.length} recent message${posts.length === 1 ? '' : 's'}.`,
    })
    return { posts }
  }, opts)
}

export async function queryUserPosts (
  author: string,
  limit = 20,
  opts?: ChatLoadOptions,
): Promise<ChatUserProfile> {
  const name = author.trim()
  return withChatOrigins(async (origin) => {
    report(opts, {
      stage: 'listing',
      detail: `Searching index for @${name}…`,
    })
    const rows = await queryChatRows(origin, { author: name }, limit)
    const comments = sortCommentsDesc(
      rows.map(commentFromQueryRow).filter((c): c is ChatComment => c != null),
    )
    report(opts, {
      stage: 'done',
      detail: `Found ${Math.min(comments.length, limit)} post${comments.length === 1 ? '' : 's'} by @${name}.`,
    })
    return {
      user: { username: name },
      recentPosts: comments.slice(0, limit).map((c) => ({
        id: c.id,
        channel_name: c.channel,
        created: c.created,
        content: c.content,
      })),
    }
  }, opts)
}

export type PutCommentInput = {
  channel: string
  content: string
  author?: string
  anonymous?: boolean
  source?: ChatCommentSource
}

export async function putComment (input: PutCommentInput): Promise<ChatPostEntry> {
  const channel = input.channel.trim()
  const content = input.content.trim()
  const anonymous = input.anonymous !== false
  const author = anonymous ? undefined : (input.author?.trim() || 'guest')
  const created = new Date()
  const id = newCommentId()
  const path = commentFilePath(channel, created, 0, id)
  const comment: ChatComment = {
    schema: 'paradigm.chat.v1',
    id,
    channel,
    author,
    anonymous,
    created: created.toISOString(),
    source: input.source ?? 'web',
    signed: false,
    content,
    path,
  }
  const markdown = serializeChatComment(comment)

  await withChatOrigins(async (origin) => {
    await relayPutText(origin, path, markdown)
    recentCache = null
    return true
  })

  return chatPostFromComment(comment)
}
