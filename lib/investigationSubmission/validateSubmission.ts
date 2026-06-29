import { z } from 'zod'

export const SUBMISSION_TOPIC_MIN = 3
export const SUBMISSION_TOPIC_MAX = 200
export const SUBMISSION_DESCRIPTION_MIN = 20
export const SUBMISSION_DESCRIPTION_MAX = 5000
export const SUBMISSION_URL_MAX = 10

const HTTP_URL = /^https?:\/\/.+/i

export function normalizeSubmissionUrls (raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    let url = item.trim()
    if (!url) continue
    url = url.replace(/[)\]},.;]+$/g, '')
    if (!HTTP_URL.test(url)) continue
    if (url.toLowerCase().startsWith('data:')) continue
    const key = url.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url)
    if (out.length >= SUBMISSION_URL_MAX) break
  }
  return out
}

export const investigationSubmissionBodySchema = z.object({
  topic: z.string().trim().min(SUBMISSION_TOPIC_MIN).max(SUBMISSION_TOPIC_MAX),
  description: z.string().trim().min(SUBMISSION_DESCRIPTION_MIN).max(SUBMISSION_DESCRIPTION_MAX),
  urls: z.array(z.string()).optional().default([]),
  email: z.string().trim().email().optional().nullable(),
  is_anonymous: z.boolean().optional().default(true),
  search_query: z.string().trim().max(500).optional().nullable(),
  source: z.enum(['form', 'site_ai', 'webmcp']).optional().default('form'),
  website: z.string().optional(),
})

export type InvestigationSubmissionInput = z.infer<typeof investigationSubmissionBodySchema>

export type ParsedInvestigationSubmission = {
  topic: string
  description: string
  urls: string[]
  email: string | null
  is_anonymous: boolean
  source: 'form' | 'site_ai' | 'webmcp'
  search_query: string | null
}

export function parseInvestigationSubmissionBody (
  body: unknown,
): { ok: true; data: ParsedInvestigationSubmission } | { ok: false; error: string } {
  const parsed = investigationSubmissionBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid submission'
    return { ok: false, error: msg }
  }
  if (parsed.data.website?.trim()) {
    return { ok: false, error: 'Invalid submission' }
  }
  const urls = normalizeSubmissionUrls(parsed.data.urls)
  const isAnonymous = parsed.data.is_anonymous !== false
  const email = isAnonymous ? null : (parsed.data.email?.trim() || null)
  return {
    ok: true,
    data: {
      topic: parsed.data.topic,
      description: parsed.data.description,
      urls,
      email,
      is_anonymous: isAnonymous,
      source: parsed.data.source,
      search_query: parsed.data.search_query?.trim() || null,
    },
  }
}

export type PublicInvestigationSubmission = {
  id: number
  created_at: string
  topic: string
  description: string
  urls: string[]
  is_anonymous: boolean
}

export function toPublicInvestigationSubmission (row: {
  id: number
  created_at: Date | string
  topic: string
  description: string
  urls: unknown
  is_anonymous: boolean
}): PublicInvestigationSubmission {
  const urls = Array.isArray(row.urls)
    ? row.urls.filter((u): u is string => typeof u === 'string')
    : []
  return {
    id: row.id,
    created_at: typeof row.created_at === 'string'
      ? row.created_at
      : row.created_at.toISOString(),
    topic: row.topic,
    description: row.description,
    urls,
    is_anonymous: row.is_anonymous,
  }
}
