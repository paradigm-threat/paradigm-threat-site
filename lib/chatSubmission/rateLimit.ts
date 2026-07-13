/** Client-side chat POST throttle (per tab session). */
const WINDOW_MS = 60_000
const MAX_POSTS = 10

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function checkChatSubmitRateLimit (clientKey = 'default'): boolean {
  const key = clientKey.trim() || 'default'
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (existing.count >= MAX_POSTS) return false
  existing.count += 1
  return true
}

export function resetChatSubmitRateLimitForTests (): void {
  buckets.clear()
}
