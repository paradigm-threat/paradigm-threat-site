'use client'

import React, { useEffect, useState, useMemo, Suspense, useRef, useCallback } from 'react'
import { getMergedSearchIndex, getRemoteFile } from '@/server/remoteFiles'
import { SearchHeader, FolderGrid, ArticleStack, ImageGallery } from '@/components/search'
import { prepareArticleMarkdown, extractFirstHeading } from '@/lib/articleBody'
import { Loader2, Search } from 'lucide-react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { filterIndexedEntriesByQuery } from '@/lib/searchIndexFilter'

function SearchContent() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const topicFromPath = Array.isArray(params?.topic)
        ? (params.topic as string[]).join('/')
        : ((params?.topic as string) || '')
    const queryFromPath = topicFromPath ? decodeURIComponent(topicFromPath) : ''
    const queryFromSearch = searchParams.get('q') || ''
    const urlQuery = queryFromPath || queryFromSearch

    const [debouncedSearch, setDebouncedSearch] = useState(urlQuery)
    const lastPushedRef = useRef(urlQuery)

    const [filesIndex, setFilesIndex] = useState<IndexedPathEntry[]>([])
    const [renderedMds, setRenderedMds] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [contentLoading, setContentLoading] = useState(false)

    // Sync list state when URL changes without our replace completing to the same value (e.g. back/forward, deep link).
    useEffect(() => {
        if (urlQuery === lastPushedRef.current) {
            return
        }
        queueMicrotask(() => {
            setDebouncedSearch(urlQuery)
            lastPushedRef.current = urlQuery
        })
    }, [urlQuery])

    // Fetch index once
    useEffect(() => {
        queueMicrotask(() => setLoading(true))
        getMergedSearchIndex()
            .then((entries) => {
                if (entries !== null) {
                    setFilesIndex(entries)
                } else {
                    setError('Received invalid file index')
                }
            })
            .catch(err => {
                console.error('Search index fetch error:', err)
                setError('Failed to load search index')
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    useEffect(() => {
        if (!loading && !contentLoading) {
            window.setTimeout(() => {
                window.dispatchEvent(new Event('dynamic-index-update'))
            }, 500)
        }
    }, [loading, contentLoading, renderedMds])

    const searchResults = useMemo(() => {
        return filterIndexedEntriesByQuery(filesIndex, debouncedSearch)
    }, [debouncedSearch, filesIndex])

    // Fetch MD content for the top results when search results change
    useEffect(() => {
        const mds = searchResults.filter((e) =>
            e.path.endsWith('.md') &&
            !e.path.endsWith('page.md') &&
            !e.path.endsWith('index.md') &&
            !e.path.includes('.auto.md')
        ).slice(0, 5)

        if (mds.length === 0) {
            queueMicrotask(() => setRenderedMds([]))
            return
        }

        queueMicrotask(() => setContentLoading(true))
        Promise.all(mds.map(async (e) => {
            const path = e.path
            const content = await getRemoteFile(path)
            if (!content) return null
            const mdxSource = prepareArticleMarkdown(content)
            const basePath = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''
            return { path, mdxSource, basePath, title: extractFirstHeading(mdxSource) }
        })).then(results => {
            setRenderedMds(results.filter(Boolean))
            setContentLoading(false)
        })
    }, [searchResults])

    const updateUrl = useCallback((val: string) => {
        lastPushedRef.current = val
        if (val && !val.includes(' ')) {
            router.replace(`/search/${encodeURIComponent(val)}`, { scroll: false })
        } else if (val) {
            router.replace(`/search?q=${encodeURIComponent(val)}`, { scroll: false })
        } else {
            router.replace('/search', { scroll: false })
        }
    }, [router])

    const onDebouncedSearchQuery = useCallback((trimmed: string) => {
        setDebouncedSearch(trimmed)
    }, [])

    const onDebouncedUrl = useCallback((trimmed: string) => {
        updateUrl(trimmed)
    }, [updateUrl])

    // Extract unique folders
    const folderPaths = Array.from(new Set(searchResults.map((e) => {
        const parts = e.path.split('/')
        return parts.length > 1 ? parts.slice(0, -1).join('/') : null
    }).filter(Boolean))) as string[]

    const folders = folderPaths.sort()
    const images = searchResults
        .filter((e) => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(e.path))
        .map((e) => e.path)

    const ds = debouncedSearch.trim()

    return (
        <div className="w-full min-h-screen bg-white dark:bg-slate-950">
            <div className="max-w-[90rem] mx-auto px-4 py-12 space-y-16">
                <SearchHeader
                    initialQuery={urlQuery}
                    loading={loading}
                    onDebouncedSearchQuery={onDebouncedSearchQuery}
                    onDebouncedUrl={onDebouncedUrl}
                />

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

                {!loading && ds.length >= 2 && searchResults.length === 0 && (
                    <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 max-w-2xl mx-auto">
                        <Search size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <div className="text-xl font-bold text-slate-900 dark:text-white mb-2">No matching files found</div>
                        <p className="text-slate-500 dark:text-slate-400">Try different terms or browse the directory directly.</p>
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="space-y-20">
                        <FolderGrid folders={folders} />

                        <ArticleStack
                            renderedMds={renderedMds}
                            contentLoading={contentLoading}
                            totalArticles={searchResults.filter((f) => f.path.endsWith('.md')).length}
                        />

                        <ImageGallery images={images} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-blue-500" size={48} /></div>}>
            <SearchContent />
        </Suspense>
    )
}
