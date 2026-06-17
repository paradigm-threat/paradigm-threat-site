'use client'

import React, { useEffect, useMemo, useState } from 'react'
import matter from 'gray-matter'
import { Loader2, Search } from 'lucide-react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { filterIndexedEntriesByQuery } from '@/lib/searchIndexFilter'
import {
  isArticleMdEntry,
  isTimelineSearchEntry,
  searchEntryHref,
  searchEntryTitle,
} from '@/lib/searchEntryDisplay'
import { getRemoteFile } from '@/server/remoteFiles'
import { fetchArticleMarkdown } from '@/lib/webmcp/fetchArticle'
import { ArticleStack } from '@/components/search/ArticleStack'
import { FolderGrid } from '@/components/search/FolderGrid'
import { ImageGallery } from '@/components/search/ImageGallery'
import { SearchResultLinks } from '@/components/search/SearchResultLinks'
import type { SearchContentFilters } from '@/lib/searchIndexFilter'

interface SearchResultsPanelProps {
  debouncedQuery: string
  filesIndex: IndexedPathEntry[]
  contentFilters: SearchContentFilters
}

export function SearchResultsPanel ({
  debouncedQuery,
  filesIndex,
  contentFilters,
}: SearchResultsPanelProps) {
  const searchResults = useMemo(() => {
    return filterIndexedEntriesByQuery(filesIndex, debouncedQuery, contentFilters)
  }, [filesIndex, debouncedQuery, contentFilters])

  const timelineResults = useMemo(
    () => searchResults.filter((e) => isTimelineSearchEntry(e.path)),
    [searchResults]
  )

  const articleMdResults = useMemo(
    () => searchResults.filter((e) => isArticleMdEntry(e.path)),
    [searchResults]
  )

  const [renderedMds, setRenderedMds] = useState<any[]>([])
  const [contentLoading, setContentLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const includeNonArticleMd = contentFilters.includeNonArticleMd

    const fileMds = articleMdResults
      .filter((e) => {
        if (includeNonArticleMd) return true
        return !e.path.endsWith('page.md') && !e.path.endsWith('index.md')
      })
      .slice(0, 5)

    const timelineMds = timelineResults.slice(0, 5)

    if (fileMds.length === 0 && timelineMds.length === 0) {
      queueMicrotask(() => {
        if (cancelled) return
        setRenderedMds([])
        setContentLoading(false)
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (!cancelled) setContentLoading(true)
    })

    Promise.all([
      ...fileMds.map(async (e) => {
        const content = await getRemoteFile(e.path)
        if (!content) return null
        const { content: mdxSource, data: frontMatter } = matter(content)
        const basePath = e.path.includes('/') ? e.path.split('/').slice(0, -1).join('/') : ''
        return {
          path: e.path,
          href: searchEntryHref(e.path),
          mdxSource,
          frontMatter,
          basePath,
          title: typeof frontMatter?.title === 'string' ? frontMatter.title : searchEntryTitle(e),
        }
      }),
      ...timelineMds.map(async (e) => {
        const content = await fetchArticleMarkdown(e.path)
        if (!content) return null
        const { content: mdxSource, data: frontMatter } = matter(content)
        return {
          path: e.path,
          href: searchEntryHref(e.path),
          mdxSource,
          frontMatter,
          basePath: 'timeline',
          title: typeof frontMatter?.title === 'string' ? frontMatter.title : searchEntryTitle(e),
        }
      }),
    ]).then((results) => {
      if (cancelled) return
      setRenderedMds(results.filter(Boolean))
      setContentLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [articleMdResults, timelineResults, contentFilters.includeNonArticleMd])

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

  const totalContentHits = articleMdResults.length + timelineResults.length

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
          <FolderGrid folders={folders} />

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

          <ArticleStack
            renderedMds={renderedMds}
            contentLoading={contentLoading}
            totalArticles={totalContentHits}
          />

          <ImageGallery images={images} />
        </>
      )}

      {contentLoading && renderedMds.length === 0 && (
        <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-600">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}
    </div>
  )
}
