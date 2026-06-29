import { sql } from '@vercel/postgres'
import {
  toPublicInvestigationSubmission,
  type ParsedInvestigationSubmission,
  type PublicInvestigationSubmission,
} from '@/lib/investigationSubmission/validateSubmission'

export type InvestigationSubmissionRow = {
  id: number
  created_at: Date
  topic: string
  description: string
  urls: unknown
  email: string | null
  is_anonymous: boolean
  source: string
  search_query: string | null
}

export async function insertInvestigationSubmission (
  input: ParsedInvestigationSubmission,
): Promise<PublicInvestigationSubmission> {
  const urlsJson = JSON.stringify(input.urls)
  const { rows } = await sql`
    INSERT INTO investigation_submissions (
      topic, description, urls, email, is_anonymous, source, search_query
    )
    VALUES (
      ${input.topic},
      ${input.description},
      ${urlsJson}::jsonb,
      ${input.email},
      ${input.is_anonymous},
      ${input.source},
      ${input.search_query}
    )
    RETURNING id, created_at, topic, description, urls, is_anonymous
  `
  const row = rows[0] as InvestigationSubmissionRow
  return toPublicInvestigationSubmission(row)
}

export async function listPublicInvestigationSubmissions (
  limit = 50,
): Promise<PublicInvestigationSubmission[]> {
  const capped = Math.min(Math.max(1, Math.floor(limit)), 100)
  const { rows } = await sql`
    SELECT id, created_at, topic, description, urls, is_anonymous
    FROM investigation_submissions
    ORDER BY created_at DESC
    LIMIT ${capped}
  `
  return (rows as InvestigationSubmissionRow[]).map(toPublicInvestigationSubmission)
}
