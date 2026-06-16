'use client'

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { SearchContentFiltersBar, SearchInputIsland } from '@/components/search'
import { SearchResultsPanel } from '@/components/search/SearchResultsPanel'
import type { SearchContentFilters } from '@/lib/searchIndexFilter'
import { DEFAULT_SEARCH_CONTENT_FILTERS } from '@/lib/searchIndexFilter'
import { getCachedMergedSearchIndex, isSearchIndexCached } from '@/lib/searchIndexCache'
import { readSearchQueryFromLocation } from '@/lib/useSearchUrlState'

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
      <div className="max-w-[90rem] mx-auto px-4 py-12 space-y-16">
        <SearchInputIsland initialQuery={initialQuery} loading={loading} onDebouncedQueryRef={onDebouncedQueryRef} />

        <SearchContentFiltersBar filters={contentFilters} onChange={setContentFilters} />

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

        {!loading && !error && (
          <SearchResultsPanel
            debouncedQuery={debouncedQuery}
            filesIndex={filesIndex}
            contentFilters={contentFilters}
          />
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
