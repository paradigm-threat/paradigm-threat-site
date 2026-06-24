'use client'

import React, { useCallback, useEffect, useRef, useState, memo } from 'react'
import { Search, Loader2 } from 'lucide-react'

const SEARCH_DEBOUNCE_MS = 120
const URL_DEBOUNCE_MS = 350

interface SearchHeaderProps {
    initialQuery?: string
    /** @deprecated Use initialQuery */
    query?: string
    loading: boolean
    onDebouncedSearchQuery?: (trimmed: string) => void
    onDebouncedUrl?: (trimmed: string) => void
    /** @deprecated Use onDebouncedUrl */
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    disabled?: boolean
}

export const SearchHeader = memo(function SearchHeader({
    initialQuery,
    query,
    loading,
    onDebouncedSearchQuery,
    onDebouncedUrl,
    onChange,
    disabled = false,
}: SearchHeaderProps) {
    const resolvedInitial = initialQuery ?? query ?? ''
    const [local, setLocal] = useState(resolvedInitial)
    const prevInitial = useRef(resolvedInitial)
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (process.env.NODE_ENV === 'production') return
        if (onChange && onDebouncedSearchQuery) {
            console.warn(
                '[SearchHeader] onChange + onDebouncedSearchQuery both set — controlled mode re-renders the parent on every keystroke and breaks mobile typing. Use SearchInputIsland instead.',
            )
        }
        if (query !== undefined && initialQuery === undefined) {
            console.warn(
                '[SearchHeader] `query` prop without `initialQuery` — parent-controlled input refreshes on every keystroke. Use SearchInputIsland with initialQuery instead.',
            )
        }
    }, [onChange, onDebouncedSearchQuery, query, initialQuery])

    useEffect(() => {
        if (resolvedInitial !== prevInitial.current) {
            prevInitial.current = resolvedInitial
            queueMicrotask(() => setLocal(resolvedInitial))
        }
    }, [resolvedInitial])

    useEffect(
        () => () => {
            if (searchTimer.current) clearTimeout(searchTimer.current)
            if (urlTimer.current) clearTimeout(urlTimer.current)
        },
        []
    )

    const onInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (disabled) return
            const val = e.target.value
            setLocal(val)
            if (onChange) {
                onChange(e)
                return
            }
            const trimmed = val.trim()

            if (searchTimer.current) clearTimeout(searchTimer.current)
            searchTimer.current = setTimeout(() => {
                searchTimer.current = null
                onDebouncedSearchQuery?.(trimmed)
            }, SEARCH_DEBOUNCE_MS)

            if (urlTimer.current) clearTimeout(urlTimer.current)
            urlTimer.current = setTimeout(() => {
                urlTimer.current = null
                onDebouncedUrl?.(trimmed)
            }, URL_DEBOUNCE_MS)
        },
        [disabled, onChange, onDebouncedSearchQuery, onDebouncedUrl]
    )

    const trimmed = local.trim()
    const showShortHint = local.length > 0 && trimmed.length < 2

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Search Repository
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Explore articles, documents, and media across the paradigm
                </p>
            </div>

            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={28} />
                <input
                    type="search"
                    autoFocus={!disabled}
                    enterKeyHint="search"
                    value={local}
                    onChange={onInputChange}
                    disabled={disabled}
                    readOnly={disabled}
                    placeholder="Type keywords (e.g. '911 physics', 'mars water')..."
                    className="w-full pl-16 pr-6 py-6 bg-slate-100 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-3xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {loading && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                    </div>
                )}
            </div>

            {showShortHint && (
                <div className="text-center text-slate-400 text-sm">
                    Please enter at least 2 characters to search...
                </div>
            )}
        </div>
    )
})
