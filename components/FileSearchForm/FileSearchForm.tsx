'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import {
    DEFAULT_SEARCH_CONTENT_FILTERS,
    filterIndexedEntriesByQuery,
    type SearchContentFilters,
} from '@/lib/searchIndexFilter'
import { fetchMergedSearchIndexClient } from '@/lib/clientMergedSearchIndex'
import { SearchContentFiltersBar, SearchResultLinks } from '@/components/search'

const SEARCH_DEBOUNCE_MS = 120

interface FileSearchFormProps {
    keywords?: string,
}

export default function FileSearchForm({ keywords = "" }: FileSearchFormProps) {
    const [inputValue, setInputValue] = useState<string>(keywords)
    const [debouncedQuery, setDebouncedQuery] = useState<string>(keywords.trim())
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [fileIndex, setFileIndex] = useState<IndexedPathEntry[]>([])
    const [contentFilters, setContentFilters] = useState<SearchContentFilters>(DEFAULT_SEARCH_CONTENT_FILTERS)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchIndex = async () => {
            try {
                setLoading(true)
                const entries = await fetchMergedSearchIndexClient()
                if (entries === null) throw new Error('search index unavailable')
                setFileIndex(entries)
                setError(null)
            } catch (err: unknown) {
                console.error('Failed to fetch file index:', err)
                setError('Failed to load search index')
            } finally {
                setLoading(false)
            }
        }
        fetchIndex()
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null
            setDebouncedQuery(inputValue.trim())
        }, SEARCH_DEBOUNCE_MS)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [inputValue])

    const searchResults = useMemo(() => {
        return filterIndexedEntriesByQuery(fileIndex, debouncedQuery, contentFilters)
    }, [debouncedQuery, fileIndex, contentFilters])

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
                <input
                    type="search"
                    placeholder="Search files and articles..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-lg"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                    </div>
                )}
            </div>

            <SearchContentFiltersBar
                filters={contentFilters}
                onChange={setContentFilters}
                className="flex flex-wrap gap-x-6 gap-y-2 text-sm px-2"
            />

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {inputValue.length >= 2 ? (
                    <>
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Search Results</h2>
                            <span className="text-sm text-slate-400">{searchResults.length} found</span>
                        </div>

                        {searchResults.length > 0 ? (
                            <>
                                <SearchResultLinks entries={searchResults} maxItems={100} />
                                {searchResults.length > 100 && (
                                    <div className="text-center py-4 text-slate-500 text-sm italic">
                                        Showing first 100 results...
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                <div className="text-slate-400 dark:text-slate-600 mb-2">No matching files found</div>
                                <div className="text-xs text-slate-500">Try different keywords or check your spelling</div>
                            </div>
                        )}
                    </>
                ) : inputValue.length > 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        Type at least 2 characters to search...
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-4">
                        <Search size={48} className="opacity-20" />
                        <p>Enter keywords to start exploring the repository</p>
                    </div>
                )}
            </div>
        </div>
    )
}
