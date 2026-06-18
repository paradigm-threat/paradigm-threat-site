export const SITE_AI_SESSION_STORAGE_KEY = 'pt-site-ai-chat-v1'
export const SITE_AI_SESSION_VERSION = 1
export const SITE_AI_MAX_MESSAGES = 40
export const SITE_AI_MAX_TOTAL_CHARS = 48_000

export type SiteAiStoredMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

type StoredPayload = {
  version: number
  messages: SiteAiStoredMessage[]
  updatedAt: number
}

function isStoredMessage (value: unknown): value is SiteAiStoredMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    typeof m.createdAt === 'number'
  )
}

function trimMessages (messages: SiteAiStoredMessage[]): SiteAiStoredMessage[] {
  let trimmed = messages.slice(-SITE_AI_MAX_MESSAGES)
  while (trimmed.length > 0) {
    const total = trimmed.reduce((n, m) => n + m.content.length, 0)
    if (total <= SITE_AI_MAX_TOTAL_CHARS) break
    trimmed = trimmed.slice(1)
  }
  return trimmed
}

export function createSiteAiMessageId (): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getLocalStorage (): Storage | null {
  if (typeof globalThis === 'undefined') return null
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadSiteAiSession (): SiteAiStoredMessage[] {
  const storage = getLocalStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(SITE_AI_SESSION_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredPayload
    if (parsed.version !== SITE_AI_SESSION_VERSION) return []
    if (!Array.isArray(parsed.messages)) return []
    return trimMessages(parsed.messages.filter(isStoredMessage))
  } catch {
    return []
  }
}

export function saveSiteAiSession (messages: SiteAiStoredMessage[]): void {
  const storage = getLocalStorage()
  if (!storage) return
  try {
    const payload: StoredPayload = {
      version: SITE_AI_SESSION_VERSION,
      messages: trimMessages(messages),
      updatedAt: Date.now(),
    }
    storage.setItem(SITE_AI_SESSION_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota or private mode — ignore */
  }
}

export function clearSiteAiSession (): void {
  const storage = getLocalStorage()
  if (!storage) return
  try {
    storage.removeItem(SITE_AI_SESSION_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function appendSiteAiMessages (
  existing: SiteAiStoredMessage[],
  additions: SiteAiStoredMessage[]
): SiteAiStoredMessage[] {
  const next = trimMessages([...existing, ...additions])
  saveSiteAiSession(next)
  return next
}
