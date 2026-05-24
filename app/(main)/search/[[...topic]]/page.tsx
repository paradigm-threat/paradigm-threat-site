'use client'

import React, { useEffect, useState, useMemo, Suspense, useRef, useCallback } from 'react'
import { fetchMergedSearchIndexClient } from '@/lib/clientMergedSearchIndex'
import { SearchHeader, FolderGrid, ImageGallery, SearchResultLinks } from '@/components/search'
import { Loader2, Search } from 'lucide-react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'

const DEBOUNCE_MS = 350
const MAX_RESULT_LINKS = 80

function SearchContent() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const topicFromPath = Array.isArray(params?.topic) ? params.topic[0] : (params?.topic as string)
    const queryFromPath = topicFromPath ? decodeURIComponent(topicFromPath) : ''
    const queryFromSearch = searchParams.get('q') || ''
    const urlQuery = queryFromPath || queryFromSearch

    const [inputValue, setInputValue] = useState(urlQuery)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastUrlUpdateRef = useRef<string>(urlQuery)
    const isDebounsingRef = useRef<boolean>(false)

    const [filesIndex, setFilesIndex] = useState<IndexedPathEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (urlQuery !== lastUrlUpdateRef.current && !isDebounsingRef.current && urlQuery !== inputValue.trim()) {
            queueMicrotask(() => setInputValue(urlQuery))
        }
        lastUrlUpdateRef.current = urlQuery
    }, [urlQuery, inputValue])

    useEffect(() => {
        queueMicrotask(() => setLoading(true))
        fetchMergedSearchIndexClient()
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

    useEffect(() => {
        if (!loading) {
            setTimeout(() => {
                window.dispatchEvent(new Event('dynamic-index-update'))
            }, 500)
        }
    }, [loading])

    const searchResults = useMemo(() => {
        if (!filesIndex || !Array.isArray(filesIndex)) return []
        const cleanQuery = inputValue.trim().toLowerCase()
        if (cleanQuery.length < 2) return []

        const searchTerms = cleanQuery.split(/\s+/).filter(Boolean)
        return filesIndex.filter((entry) => {
            if (!entry || typeof entry.path !== 'string') return false
            if (entry.path.includes('.auto.md')) return false
            const haystack = entry.searchText.toLowerCase()
            return searchTerms.every((term) => haystack.includes(term))
        })
    }, [inputValue, filesIndex])

    const linkResults = useMemo(() => {
        return searchResults.filter((e) => {
            if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(e.path)) return false
            if (e.path.startsWith('timeline/')) return true
            if (e.path.endsWith('.md') && !e.path.endsWith('page.md') && !e.path.endsWith('index.md')) {
                return true
            }
            return false
        })
    }, [searchResults])

    const updateUrl = useCallback((val: string) => {
        lastUrlUpdateRef.current = val
        if (val && !val.includes(' ')) {
            router.replace(`/search/${encodeURIComponent(val)}`, { scroll: false })
        } else if (val) {
            router.replace(`/search?q=${encodeURIComponent(val)}`, { scroll: false })
        } else {
            router.replace('/search', { scroll: false })
        }
    }, [router])

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInputValue(val)
        const trimmed = val.trim()
        if (debounceRef.current) clearTimeout(debounceRef.current)
        isDebounsingRef.current = true
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null
            isDebounsingRef.current = false
            updateUrl(trimmed)
        }, DEBOUNCE_MS)
    }, [updateUrl])

    useEffect(() => () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
            isDebounsingRef.current = false
        }
    }, [])

    const folderPaths = Array.from(new Set(searchResults.map((e) => {
        const parts = e.path.split('/')
        return parts.length > 1 ? parts.slice(0, -1).join('/') : null
    }).filter(Boolean))) as string[]

    const folders = folderPaths.sort()
    const images = searchResults
        .filter((e) => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(e.path))
        .map((e) => e.path)

    return (
        <div className="w-full min-h-screen bg-white dark:bg-slate-950">
            <div className="max-w-[90rem] mx-auto px-4 py-12 space-y-16">
                <SearchHeader
                    query={inputValue}
                    loading={loading}
                    onChange={handleSearchChange}
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

                {inputValue.length > 0 && inputValue.trim().length < 2 && (
                    <div className="text-center py-20 text-slate-400">
                        Please enter at least 2 characters to search...
                    </div>
                )}

                {!loading && inputValue.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 max-w-2xl mx-auto">
                        <Search size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <div className="text-xl font-bold text-slate-900 dark:text-white mb-2">No matching files found</div>
                        <p className="text-slate-500 dark:text-slate-400">Try different terms or browse the directory directly.</p>
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="space-y-20">
                        <FolderGrid folders={folders} />

                        {linkResults.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Matches
                                    {linkResults.length > MAX_RESULT_LINKS
                                        ? ` (showing first ${MAX_RESULT_LINKS})`
                                        : ''}
                                </h2>
                                <SearchResultLinks
                                    entries={linkResults}
                                    maxItems={MAX_RESULT_LINKS}
                                />
                            </section>
                        )}

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
