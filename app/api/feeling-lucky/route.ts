import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getMergedSearchIndex } from '@/server/remoteFiles'
import { feelingLuckyPathToHref, isFeelingLuckyCandidate } from '@/lib/feelingLucky'

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
  try {
    const hrefs = await getCachedHrefs()
    if (hrefs.length === 0) {
      return NextResponse.json({ error: 'No articles in index' }, { status: 503 })
    }
    const href = hrefs[Math.floor(Math.random() * hrefs.length)]!
    return NextResponse.json({ href })
  } catch {
    return NextResponse.json({ error: 'Failed to pick a random page' }, { status: 500 })
  }
}
