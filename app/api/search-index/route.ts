import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getMergedSearchIndex } from '@/server/remoteFiles'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'

const getCachedMergedIndex = unstable_cache(
  async (): Promise<IndexedPathEntry[] | null> => getMergedSearchIndex(),
  ['merged-search-index-json'],
  { revalidate: 120 }
)

export async function GET () {
  try {
    const entries = await getCachedMergedIndex()
    if (entries === null) {
      return NextResponse.json({ error: 'Could not load search index' }, { status: 503 })
    }
    return NextResponse.json(entries)
  } catch {
    return NextResponse.json({ error: 'Failed to load search index' }, { status: 500 })
  }
}
