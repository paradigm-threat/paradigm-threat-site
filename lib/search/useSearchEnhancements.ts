'use client'

import { useMemo } from 'react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import type { SearchContentFilters } from '@/lib/searchIndexFilter'
import { filterAndRankSearchEntries } from '@/lib/search/searchSiteQuery'
import {
  isArticleMdEntry,
  isTimelineSearchEntry,
} from '@/lib/searchEntryDisplay'
import {
  getLowResultsHints,
  getRelatedKeywords,
  partitionArticleHits,
} from '@/lib/search/searchEnhancements'

export function useSearchEnhancements (
  filesIndex: IndexedPathEntry[],
  debouncedQuery: string,
  contentFilters: SearchContentFilters,
) {
  const cleanQuery = debouncedQuery.trim()

  const searchResults = useMemo(() => {
    if (cleanQuery.length < 2) return []
    return filterAndRankSearchEntries(filesIndex, debouncedQuery, contentFilters)
  }, [filesIndex, debouncedQuery, contentFilters, cleanQuery])

  const articleMdResults = useMemo(
    () => searchResults.filter((e) => isArticleMdEntry(e.path)),
    [searchResults],
  )

  const articleEntriesRaw = useMemo(() => {
    const includeNonArticleMd = contentFilters.includeNonArticleMd
    return articleMdResults.filter((e) => {
      if (includeNonArticleMd) return true
      return !e.path.endsWith('page.md') && !e.path.endsWith('index.md')
    })
  }, [articleMdResults, contentFilters.includeNonArticleMd])

  const { primary: primaryArticleEntries, suggested: suggestedArticleEntries } = useMemo(() => {
    if (cleanQuery.length < 2) {
      return { primary: articleEntriesRaw, suggested: [] as IndexedPathEntry[] }
    }
    return partitionArticleHits(articleEntriesRaw, filesIndex, cleanQuery, contentFilters)
  }, [articleEntriesRaw, filesIndex, cleanQuery, contentFilters])

  const relatedKeywords = useMemo(() => {
    if (cleanQuery.length < 2) return []
    return getRelatedKeywords(filesIndex, cleanQuery, contentFilters)
  }, [filesIndex, cleanQuery, contentFilters])

  const lowResultsHints = useMemo(() => {
    if (cleanQuery.length < 2) return null
    return getLowResultsHints(filesIndex, cleanQuery, contentFilters, searchResults.length)
  }, [filesIndex, cleanQuery, contentFilters, searchResults.length])

  const resultPaths = useMemo(() => {
    const ranked = [...primaryArticleEntries, ...suggestedArticleEntries]
    const seen = new Set<string>()
    const paths: string[] = []
    for (const e of ranked) {
      if (!isArticleMdEntry(e.path) && !isTimelineSearchEntry(e.path)) continue
      if (seen.has(e.path)) continue
      seen.add(e.path)
      paths.push(e.path)
      if (paths.length >= 12) break
    }
    return paths
  }, [primaryArticleEntries, suggestedArticleEntries])

  return {
    searchResults,
    primaryArticleEntries,
    suggestedArticleEntries,
    relatedKeywords,
    lowResultsHints,
    resultPaths,
  }
}
