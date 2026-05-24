import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getMergedSearchIndex } from '@/server/remoteFiles'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { isSearchDisabled } from '@/lib/siteOpsFeature'
import { logOpsEvent } from '@/lib/opsServerLog'
import { API_SEARCH_DISABLED_ERROR } from '@/lib/siteOpsMessages'

const getCachedMergedIndex = unstable_cache(
  async (): Promise<IndexedPathEntry[] | null> => getMergedSearchIndex(),
  ['merged-search-index-json'],
  { revalidate: 120 }
)

export async function GET () {
  if (isSearchDisabled()) {
    logOpsEvent({
      kind: 'pt_search',
      route: 'search-index',
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
    const entries = await getCachedMergedIndex()
    if (entries === null) {
      logOpsEvent({
        kind: 'pt_search',
        route: 'search-index',
        event: 'error',
        error: 'Could not load search index',
        durationMs: Date.now() - started,
      })
      return NextResponse.json({ error: 'Could not load search index' }, { status: 503 })
    }
    logOpsEvent({
      kind: 'pt_search',
      route: 'search-index',
      event: 'served',
      entryCount: entries.length,
      durationMs: Date.now() - started,
    })
    return NextResponse.json(entries)
  } catch {
    logOpsEvent({
      kind: 'pt_search',
      route: 'search-index',
      event: 'error',
      error: 'Failed to load search index',
      durationMs: Date.now() - started,
    })
    return NextResponse.json({ error: 'Failed to load search index' }, { status: 500 })
  }
}
