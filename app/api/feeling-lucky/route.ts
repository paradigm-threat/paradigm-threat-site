import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getMergedSearchIndex } from '@/server/remoteFiles'
import { feelingLuckyPathToHref, isFeelingLuckyCandidate } from '@/lib/feelingLucky'
import { isSearchServerApiDisabled } from '@/lib/siteOpsFeature'
import { logOpsEvent } from '@/lib/opsServerLog'
import { API_SEARCH_DISABLED_ERROR } from '@/lib/siteOpsMessages'

const getCachedHrefs = unstable_cache(
  async (): Promise<string[]> => {
    const entries = await getMergedSearchIndex()
    if (!entries?.length) return []
    const hrefs = new Set<string>()
    for (const e of entries) {
      if (!isFeelingLuckyCandidate(e.path)) continue
      hrefs.add(feelingLuckyPathToHref(e.path))
    }
    return Array.from(hrefs)
  },
  ['feeling-lucky-hrefs'],
  { revalidate: 600 }
)

export async function GET () {
  if (isSearchServerApiDisabled()) {
    logOpsEvent({
      kind: 'pt_search',
      route: 'feeling-lucky',
      event: 'blocked',
      disabled: true,
    })
    return NextResponse.json(
      { error: API_SEARCH_DISABLED_ERROR, disabled: true },
      { status: 503 },
    )
  }

  const started = Date.now()
  try {
    const hrefs = await getCachedHrefs()
    if (hrefs.length === 0) {
      return NextResponse.json({ error: 'No articles in index' }, { status: 503 })
    }
    const href = hrefs[Math.floor(Math.random() * hrefs.length)]!
    logOpsEvent({
      kind: 'pt_search',
      route: 'feeling-lucky',
      event: 'served',
      entryCount: hrefs.length,
      durationMs: Date.now() - started,
    })
    return NextResponse.json({ href })
  } catch {
    logOpsEvent({
      kind: 'pt_search',
      route: 'feeling-lucky',
      event: 'error',
      error: 'Failed to pick a random page',
      durationMs: Date.now() - started,
    })
    return NextResponse.json({ error: 'Failed to pick a random page' }, { status: 500 })
  }
}
