/**
 * Pure Relay chat client — QUERY reads + PUT writes on `chat/public` branch host.
 */

import { queryRelayOrigin } from '@/lib/relayQuery'
import {
  CHAT_CHANNELS_JSON,
  CHAT_CHANNELS_ROOT,
  channelPathPrefix,
  commentFilePath,
  newCommentId,
} from '@/lib/chat/chatPath'
import { CHAT_RELAY_BRANCH, getChatRelayOriginList } from '@/lib/chat/chatRelayOrigin'
import {
  displayUsername,
  parseChatMarkdown,
  serializeChatComment,
  type ChatComment,
  type ChatCommentSource,
} from '@/lib/chat/chatMarkdown'

const FETCH_TIMEOUT_MS = 60_000
const QUERY_LIMIT = 5000

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

let pathListCache: { at: number; paths: string[] } | null = null
const PATH_CACHE_MS = 30_000

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

async function fetchWithTimeout (url: string, init?: RequestInit): Promise<Response> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  const headers = chatRelayHeaders(init?.headers)
  return fetch(url, { ...init, headers, signal, cache: 'no-store' })
}

async function withChatOrigins<T> (
  fn: (origin: string) => Promise<T | null>,
): Promise<T> {
  const origins = getChatRelayOriginList()
  if (!origins.length) {
    throw new Error('Chat Relay origin not configured (set NEXT_PUBLIC_CHAT_RELAY_ORIGIN or NEXT_PUBLIC_FILES_BASE_URL)')
  }
  let lastErr: unknown
  for (const origin of origins) {
    try {
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

async function listChatPaths (origin: string): Promise<string[]> {
  const now = Date.now()
  if (pathListCache && now - pathListCache.at < PATH_CACHE_MS) {
    return pathListCache.paths
  }
  const env = await queryRelayOrigin(origin, {
    collection: 'chat',
    query: '',
    limit: QUERY_LIMIT,
    branch: CHAT_RELAY_BRANCH,
  })
  const paths = env.results
    .map((r) => (typeof r.path === 'string' ? r.path : ''))
    .filter((p) => p.startsWith(CHAT_CHANNELS_ROOT) && p.endsWith('.md'))
  pathListCache = { at: now, paths }
  return paths
}

export function resetChatRelayCaches (): void {
  pathListCache = null
}

async function loadCommentsForPaths (
  origin: string,
  paths: string[],
): Promise<ChatComment[]> {
  const limited = paths.slice(0, QUERY_LIMIT)
  const results = await Promise.all(
    limited.map(async (path) => {
      const raw = await relayGetText(origin, path)
      if (!raw) return null
      return parseChatMarkdown(raw, path)
    }),
  )
  return results.filter((c): c is ChatComment => c != null)
}

function sortCommentsDesc (comments: ChatComment[]): ChatComment[] {
  return [...comments].sort((a, b) => {
    const byCreated = b.created.localeCompare(a.created)
    if (byCreated !== 0) return byCreated
    return (b.path || '').localeCompare(a.path || '')
  })
}

export async function queryChannels (): Promise<ChatChannelInfo[]> {
  return withChatOrigins(async (origin) => {
    const raw = await relayGetText(origin, CHAT_CHANNELS_JSON)
    if (!raw) return null
    const data = JSON.parse(raw) as ChannelsJson
    const channels = data.channels ?? []
    return channels.map((c, i) => ({
      id: i + 1,
      name: c.name,
      description: c.description ?? '',
    }))
  })
}

export async function queryPosts (channel: string, limit = 50): Promise<{ channel: string; posts: ChatPostEntry[] }> {
  const prefix = channelPathPrefix(channel)
  return withChatOrigins(async (origin) => {
    const paths = (await listChatPaths(origin)).filter((p) => p.startsWith(prefix))
    paths.sort().reverse()
    const comments = sortCommentsDesc(await loadCommentsForPaths(origin, paths.slice(0, limit)))
    return {
      channel,
      posts: comments.map(chatPostFromComment),
    }
  })
}

export async function queryRecentPosts (limit = 50): Promise<{ posts: ChatPostEntry[] }> {
  return withChatOrigins(async (origin) => {
    const paths = await listChatPaths(origin)
    paths.sort().reverse()
    const comments = sortCommentsDesc(await loadCommentsForPaths(origin, paths.slice(0, Math.min(limit * 2, 200))))
    return {
      posts: comments.slice(0, limit).map(chatPostFromComment),
    }
  })
}

export async function queryUserPosts (author: string, limit = 20): Promise<ChatUserProfile> {
  const name = author.trim()
  return withChatOrigins(async (origin) => {
    const paths = await listChatPaths(origin)
    const comments = sortCommentsDesc(await loadCommentsForPaths(origin, paths))
    const mine = comments.filter((c) => {
      if (c.anonymous) return false
      return (c.author || '').toLowerCase() === name.toLowerCase()
    })
    return {
      user: { username: name },
      recentPosts: mine.slice(0, limit).map((c) => ({
        id: c.id,
        channel_name: c.channel,
        created: c.created,
        content: c.content,
      })),
    }
  })
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
    pathListCache = null
    return true
  })

  return chatPostFromComment(comment)
}
