/** Simple in-memory POST rate limit for investigation submissions (per server instance). */
const WINDOW_MS = 60 * 60 * 1000
const MAX_POSTS = 3

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function checkInvestigationSubmitRateLimit (clientKey: string): boolean {
  const key = clientKey.trim() || 'unknown'
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

export function resetInvestigationSubmitRateLimitForTests (): void {
  buckets.clear()
}

export function getClientIpFromRequest (req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}
