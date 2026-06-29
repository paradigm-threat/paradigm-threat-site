import type { ParsedInvestigationSubmission, PublicInvestigationSubmission } from '@/lib/investigationSubmission/validateSubmission'

export type SubmitInvestigationPayload = Omit<ParsedInvestigationSubmission, 'source' | 'search_query'> & {
  source?: ParsedInvestigationSubmission['source']
  search_query?: string | null
  website?: string
}

export async function postInvestigationSubmission (
  payload: SubmitInvestigationPayload,
): Promise<PublicInvestigationSubmission> {
  const res = await fetch('/api/investigation-submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Could not save submission.'
    throw new Error(msg)
  }
  if (!data.submission) throw new Error('Invalid response from server.')
  return data.submission as PublicInvestigationSubmission
}

export async function fetchRecentInvestigationSubmissions (
  limit = 50,
): Promise<PublicInvestigationSubmission[]> {
  const res = await fetch(`/api/investigation-submissions?limit=${limit}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not load submissions.')
  }
  return Array.isArray(data.submissions) ? data.submissions : []
}
