import { NextResponse } from 'next/server'
import { revalidateTag, unstable_cache } from 'next/cache'
import {
  insertInvestigationSubmission,
  listPublicInvestigationSubmissions,
} from '@/server/investigationSubmissionsDB'
import { parseInvestigationSubmissionBody } from '@/lib/investigationSubmission/validateSubmission'
import {
  checkInvestigationSubmitRateLimit,
  getClientIpFromRequest,
} from '@/lib/investigationSubmission/rateLimit'
import { isInvestigationSubmitEnabled } from '@/lib/siteOpsFeature'

const LIST_CACHE_TAG = 'investigation-submissions-list'
const LIST_S_MAXAGE = 60
const LIST_STALE_WHILE_REVALIDATE = 300

const getCachedPublicSubmissions = unstable_cache(
  async (limit: number) => listPublicInvestigationSubmissions(limit),
  ['investigation-submissions-list'],
  { revalidate: LIST_S_MAXAGE, tags: [LIST_CACHE_TAG] },
)

function listCacheHeaders (): HeadersInit {
  const cacheControl = `public, s-maxage=${LIST_S_MAXAGE}, stale-while-revalidate=${LIST_STALE_WHILE_REVALIDATE}`
  return {
    'Cache-Control': cacheControl,
    'CDN-Cache-Control': cacheControl,
    'Vercel-CDN-Cache-Control': cacheControl,
  }
}

function disabledResponse () {
  return NextResponse.json(
    { error: 'Investigation submissions are temporarily unavailable.' },
    { status: 503 },
  )
}

export async function GET (req: Request) {
  if (!isInvestigationSubmitEnabled()) return disabledResponse()
  try {
    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const submissions = await getCachedPublicSubmissions(
      Number.isFinite(limit) ? limit : 50,
    )
    return NextResponse.json({ submissions }, { headers: listCacheHeaders() })
  } catch (e) {
    console.error('[investigation-submissions] GET failed', e)
    return NextResponse.json(
      { error: 'Could not load submissions.' },
      { status: 500 },
    )
  }
}

export async function POST (req: Request) {
  if (!isInvestigationSubmitEnabled()) return disabledResponse()
  try {
    const ip = getClientIpFromRequest(req)
    if (!checkInvestigationSubmitRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const parsed = parseInvestigationSubmissionBody(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const submission = await insertInvestigationSubmission(parsed.data)
    revalidateTag(LIST_CACHE_TAG, 'max')
    return NextResponse.json({ ok: true, submission }, { status: 201 })
  } catch (e) {
    console.error('[investigation-submissions] POST failed', e)
    return NextResponse.json(
      { error: 'Could not save submission.' },
      { status: 500 },
    )
  }
}
