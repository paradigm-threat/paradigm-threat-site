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
/** Oversample FTS hits then filter by channel path prefix. */
const CHANNEL_QUERY_OVERSAMPLE = 4
const CHANNEL_QUERY_MIN = 200

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

/** FTS terms from channel name (`cosmos/mars` → `cosmos mars`). */
function channelFtsQuery (channel: string): string {
  return channel
    .trim()
    .split(/[/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(' ')
}

async function listChannelPaths (
  origin: string,
  channel: string,
  limit: number,
  opts?: ChatLoadOptions,
): Promise<string[]> {
  const prefix = channelPathPrefix(channel)
  report(opts, {
    stage: 'listing',
    detail: `Querying index for #${channel}…`,
  })
  const env = await queryRelayOrigin(origin, {
    collection: 'chat',
    query: channelFtsQuery(channel),
    limit: Math.max(limit * CHANNEL_QUERY_OVERSAMPLE, CHANNEL_QUERY_MIN),
    branch: CHAT_RELAY_BRANCH,
  })
  const paths = env.results
    .map((r) => (typeof r.path === 'string' ? r.path : ''))
    .filter((p) => p.startsWith(prefix) && p.endsWith('.md'))
  // Server orders by path DESC (ISO timestamps); keep that order.
  return paths.slice(0, limit)
}

async function listRecentPaths (
  origin: string,
  limit: number,
  opts?: ChatLoadOptions,
): Promise<string[]> {
  const now = Date.now()
  if (pathListCache && now - pathListCache.at < PATH_CACHE_MS) {
    report(opts, { stage: 'listing', detail: 'Using cached path list…' })
    return pathListCache.paths.slice(0, limit)
  }
  report(opts, {
    stage: 'listing',
    detail: 'Querying recent chat index…',
  })
  const env = await queryRelayOrigin(origin, {
    collection: 'chat',
    query: '',
    limit,
    branch: CHAT_RELAY_BRANCH,
  })
  const paths = env.results
    .map((r) => (typeof r.path === 'string' ? r.path : ''))
    .filter((p) => p.startsWith(CHAT_CHANNELS_ROOT) && p.endsWith('.md'))
  pathListCache = { at: now, paths }
  return paths.slice(0, limit)
}

export function resetChatRelayCaches (): void {
  pathListCache = null
}

async function loadCommentsForPaths (
  origin: string,
  paths: string[],
  opts?: ChatLoadOptions,
): Promise<ChatComment[]> {
  const total = paths.length
  report(opts, {
    stage: 'fetching',
    detail: total === 0 ? 'No messages to fetch.' : `Fetching ${total} message${total === 1 ? '' : 's'}…`,
    loaded: 0,
    total,
  })
  let loaded = 0
  const results = await Promise.all(
    paths.map(async (path) => {
      const raw = await relayGetText(origin, path)
      loaded += 1
      if (loaded === total || loaded % 5 === 0) {
        report(opts, {
          stage: 'fetching',
          detail: `Fetched ${loaded}/${total} messages…`,
          loaded,
          total,
        })
      }
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
    const paths = await listChannelPaths(origin, channel, limit, opts)
    const comments = sortCommentsDesc(await loadCommentsForPaths(origin, paths, opts))
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
    const paths = await listRecentPaths(origin, Math.min(limit * 2, 200), opts)
    const comments = sortCommentsDesc(await loadCommentsForPaths(origin, paths, opts))
    const posts = comments.slice(0, limit).map(chatPostFromComment)
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
    // User search still needs a wider path scan; keep recent-sized window.
    const paths = await listRecentPaths(origin, 500, opts)
    report(opts, {
      stage: 'fetching',
      detail: `Scanning recent messages for @${name}…`,
    })
    const comments = sortCommentsDesc(await loadCommentsForPaths(origin, paths, opts))
    const mine = comments.filter((c) => {
      if (c.anonymous) return false
      return (c.author || '').toLowerCase() === name.toLowerCase()
    })
    report(opts, {
      stage: 'done',
      detail: `Found ${Math.min(mine.length, limit)} post${mine.length === 1 ? '' : 's'} by @${name}.`,
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
    pathListCache = null
    return true
  })

  return chatPostFromComment(comment)
}
