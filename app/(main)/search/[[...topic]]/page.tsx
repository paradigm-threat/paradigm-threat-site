'use client'

// CANONICAL thin shell — SearchInputIsland + SearchResultsPanel (see .cursor/rules/search-page-revert-artifact.mdc).
// A broken monolithic version of this file sometimes reappears as uncommitted dirt — run scripts/check-search-page-canonical.sh before commit.

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import {
  SearchAiLaunchBar,
  SearchContentFiltersBar,
  SearchInputIsland,
  SearchKeywordChips,
  SearchPasteFindPanel,
} from '@/components/search'
import { SearchResultsPanel } from '@/components/search/SearchResultsPanel'
import { useSiteAi, useSiteAiPageContextRegistration } from '@/components/SiteAi/SiteAiProvider'
import type { SearchContentFilters } from '@/lib/searchIndexFilter'
import { DEFAULT_SEARCH_CONTENT_FILTERS } from '@/lib/searchIndexFilter'
import { getCachedMergedSearchIndex, isSearchIndexCached } from '@/lib/searchIndexCache'
import {
  buildSearchChatIntent,
  readSearchNlMode,
  writeSearchNlMode,
} from '@/lib/search/searchChatIntents'
import { useSearchEnhancements } from '@/lib/search/useSearchEnhancements'
import { useSiteAiAvailable } from '@/lib/siteAi/useSiteAiAvailable'
import { readSearchQueryFromLocation } from '@/lib/useSearchUrlState'
import { setSearchFiltersState } from '@/lib/webmcp/searchFiltersState'

type SearchTab = 'keyword' | 'paste'

function SearchContent() {
  const initialQuery = useMemo(() => readSearchQueryFromLocation(), [])
  const onDebouncedQueryRef = useRef<(q: string) => void>(() => {})
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery)
  useEffect(() => {
    onDebouncedQueryRef.current = (q: string) => setDebouncedQuery(q)
  }, [])

  const [filesIndex, setFilesIndex] = useState<IndexedPathEntry[]>([])
  const [contentFilters, setContentFilters] = useState<SearchContentFilters>(DEFAULT_SEARCH_CONTENT_FILTERS)
  const [loading, setLoading] = useState(() => !isSearchIndexCached())
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SearchTab>('keyword')
  const [nlMode, setNlMode] = useState(() => readSearchNlMode())
  const { openModal } = useSiteAi()
  const siteAiAvailable = useSiteAiAvailable() === 'available'

  useEffect(() => {
    setSearchFiltersState({
      includeBlog: contentFilters.includeBlog,
      includeNonArticleMd: contentFilters.includeNonArticleMd,
    })
  }, [contentFilters])

  const searchPageContext = useMemo(() => ({
    path: '/search',
    title: 'Search',
    excerpt: debouncedQuery.trim().slice(0, 200) || undefined,
  }), [debouncedQuery])
  useSiteAiPageContextRegistration(searchPageContext)

  const {
    searchResults,
    primaryArticleEntries,
    suggestedArticleEntries,
    relatedKeywords,
    lowResultsHints,
    resultPaths,
  } = useSearchEnhancements(filesIndex, debouncedQuery, contentFilters)

  const searchContext = useMemo(() => ({
    query: debouncedQuery.trim(),
    resultPaths,
    filters: contentFilters,
  }), [debouncedQuery, resultPaths, contentFilters])

  const handleNlModeChange = useCallback((enabled: boolean) => {
    setNlMode(enabled)
    writeSearchNlMode(enabled)
  }, [])

  const handleNlSearchSubmit = useCallback((query: string) => {
    const trimmed = query.trim()
    if (trimmed.length < 3) return
    const built = buildSearchChatIntent({
      intent: 'nl-search',
      question: trimmed,
      searchContext: {
        query: trimmed,
        resultPaths: [],
        filters: contentFilters,
      },
    })
    openModal({
      presentation: 'expanded',
      intent: 'nl-search',
      searchContext: {
        query: trimmed,
        resultPaths: [],
        filters: contentFilters,
      },
      question: built.userMessage,
      autoSubmit: true,
    })
  }, [contentFilters, openModal])

  useEffect(() => {
    if (!isSearchIndexCached()) {
      queueMicrotask(() => {
        setLoading(true)
        setError(null)
      })
    }
    getCachedMergedSearchIndex()
      .then((entries) => {
        if (entries !== null) {
          setFilesIndex(entries)
        } else {
          setError('Received invalid file index')
        }
      })
      .catch((err) => {
        console.error('Search index fetch error:', err)
        setError('Failed to load search index')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div className="w-full min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-[90rem] mx-auto px-4 py-12 space-y-10">
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('keyword')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'keyword'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            Keyword
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'paste'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            Paste to find
          </button>
        </div>

        {activeTab === 'keyword' && (
          <>
            <SearchInputIsland
              initialQuery={initialQuery}
              loading={loading}
              onDebouncedQueryRef={onDebouncedQueryRef}
              nlMode={nlMode}
              onNlSearchSubmit={handleNlSearchSubmit}
            />

            <SearchContentFiltersBar
              filters={contentFilters}
              onChange={setContentFilters}
              nlMode={nlMode}
              onNlModeChange={handleNlModeChange}
              showNlToggle={siteAiAvailable}
            />

            {!loading && debouncedQuery.trim().length >= 2 && (
              <SearchKeywordChips keywords={relatedKeywords} query={debouncedQuery} />
            )}
          </>
        )}

        {activeTab === 'paste' && !loading && !error && (
          <SearchPasteFindPanel filesIndex={filesIndex} contentFilters={contentFilters} />
        )}

        {error && (
          <div className="max-w-2xl mx-auto p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl text-center">
            <div className="font-bold text-lg mb-2">Error</div>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === 'keyword' && !loading && !error && (
          <div className="space-y-16">
            <SearchResultsPanel
              debouncedQuery={debouncedQuery}
              filesIndex={filesIndex}
              contentFilters={contentFilters}
              primaryArticleEntries={primaryArticleEntries}
              suggestedArticleEntries={suggestedArticleEntries}
              searchResults={searchResults}
            />
            {debouncedQuery.trim().length >= 2 && (
              <SearchAiLaunchBar
                query={debouncedQuery}
                searchContext={searchContext}
                relatedKeywords={relatedKeywords}
                hasResults={searchResults.length > 0}
                lowResultsHints={lowResultsHints}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
