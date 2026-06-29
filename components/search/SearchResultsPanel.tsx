'use client'

import React, { useMemo } from 'react'
import { Search } from 'lucide-react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { filterIndexedEntriesByQuery } from '@/lib/searchIndexFilter'
import {
  isTimelineSearchEntry,
} from '@/lib/searchEntryDisplay'
import { ArticleStack } from '@/components/search/ArticleStack'
import { FolderGrid } from '@/components/search/FolderGrid'
import { ImageGallery } from '@/components/search/ImageGallery'
import { SearchResultLinks } from '@/components/search/SearchResultLinks'
import { SearchSuggestedSection } from '@/components/search/SearchSuggestedSection'
import type { SearchContentFilters } from '@/lib/searchIndexFilter'

interface SearchResultsPanelProps {
  debouncedQuery: string
  filesIndex: IndexedPathEntry[]
  contentFilters: SearchContentFilters
  primaryArticleEntries: IndexedPathEntry[]
  suggestedArticleEntries: IndexedPathEntry[]
  searchResults?: IndexedPathEntry[]
}

export function SearchResultsPanel ({
  debouncedQuery,
  filesIndex,
  contentFilters,
  primaryArticleEntries,
  suggestedArticleEntries,
  searchResults: searchResultsProp,
}: SearchResultsPanelProps) {
  const searchResults = useMemo(() => {
    if (searchResultsProp) return searchResultsProp
    return filterIndexedEntriesByQuery(filesIndex, debouncedQuery, contentFilters)
  }, [searchResultsProp, filesIndex, debouncedQuery, contentFilters])

  const timelineResults = useMemo(
    () => searchResults.filter((e) => isTimelineSearchEntry(e.path)),
    [searchResults]
  )

  const folders = useMemo(() => {
    const folderPaths = Array.from(
      new Set(
        searchResults
          .filter((e) => !isTimelineSearchEntry(e.path))
          .map((e) => {
            const parts = e.path.split('/')
            return parts.length > 1 ? parts.slice(0, -1).join('/') : null
          })
          .filter(Boolean)
      )
    ) as string[]
    return folderPaths.sort()
  }, [searchResults])

  const images = useMemo(() => {
    return searchResults
      .filter((e) => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(e.path))
      .map((e) => e.path)
  }, [searchResults])

  const cleanQuery = debouncedQuery.trim()
  const showEmpty =
    cleanQuery.length >= 2 &&
    searchResults.length === 0

  if (cleanQuery.length < 2) return null

  return (
    <div className="space-y-20">
      {showEmpty && (
        <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 max-w-2xl mx-auto">
          <Search size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <div className="text-xl font-bold text-slate-900 dark:text-white mb-2">No matching files found</div>
          <p className="text-slate-500 dark:text-slate-400">Try different terms or browse the directory directly.</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <>
          <ArticleStack entries={primaryArticleEntries} />

          <SearchSuggestedSection entries={suggestedArticleEntries} />

          {timelineResults.length > 0 && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-violet-500 rounded-full" />
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Timeline</h2>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-bold text-slate-500">
                  {timelineResults.length}
                </span>
              </div>
              <SearchResultLinks entries={timelineResults} maxItems={12} />
            </div>
          )}

          {folders.length > 0 && <FolderGrid folders={folders} />}

          {images.length > 0 && <ImageGallery images={images} />}
        </>
      )}
    </div>
  )
}
