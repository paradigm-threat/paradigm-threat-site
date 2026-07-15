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
    nlMode?: boolean
    onNlSearchSubmit?: (query: string) => void
}

export const SearchHeader = memo(function SearchHeader({
    initialQuery,
    query,
    loading,
    onDebouncedSearchQuery,
    onDebouncedUrl,
    onChange,
    disabled = false,
    nlMode = false,
    onNlSearchSubmit,
}: SearchHeaderProps) {
    const resolvedInitial = initialQuery ?? query ?? ''
    const [local, setLocal] = useState(resolvedInitial)
    const prevInitial = useRef(resolvedInitial)
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const searchAnchor = useRef<HTMLDivElement | null>(null)
    const floatingRef = useRef(false)
    const [floating, setFloating] = useState(false)
    const [floatingBounds, setFloatingBounds] = useState({ left: 0, top: 0, width: 0 })

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

    useEffect(() => {
        let frame = 0
        const updateFloating = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
                const anchor = searchAnchor.current
                if (!anchor) return
                const navbarBottom =
                    document.querySelector<HTMLElement>('[data-site-navbar]')?.getBoundingClientRect().bottom ?? 0
                const rect = anchor.getBoundingClientRect()
                const nextFloating = rect.top <= navbarBottom
                if (nextFloating !== floatingRef.current) {
                    floatingRef.current = nextFloating
                    setFloating(nextFloating)
                }
                if (nextFloating) {
                    setFloatingBounds((prev) => {
                        const next = {
                            left: Math.round(rect.left),
                            top: Math.round(navbarBottom),
                            width: Math.round(rect.width),
                        }
                        return prev.left === next.left && prev.top === next.top && prev.width === next.width
                            ? prev
                            : next
                    })
                }
            })
        }
        updateFloating()
        window.addEventListener('scroll', updateFloating, { passive: true })
        window.addEventListener('resize', updateFloating)
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('scroll', updateFloating)
            window.removeEventListener('resize', updateFloating)
        }
    }, [])

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
        <>
            <div className="mx-auto w-full max-w-3xl space-y-4 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Search Repository
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Explore articles, documents, and media across the paradigm
                </p>
            </div>

            <div
                ref={searchAnchor}
                className={`mx-auto w-full max-w-3xl ${nlMode ? 'h-32' : 'h-[104px]'}`}
            >
                <div
                    data-search-sticky
                    data-floating={floating ? 'true' : 'false'}
                    className={`z-[90] bg-white/95 py-3 backdrop-blur-md dark:bg-slate-950/95 ${
                        floating ? 'fixed' : 'relative w-full'
                    }`}
                    style={floating ? floatingBounds : undefined}
                >
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={28} />
                    <input
                        type="search"
                        autoFocus={!disabled}
                        enterKeyHint="search"
                        value={local}
                        onChange={onInputChange}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter' || !nlMode || !onNlSearchSubmit) return
                            e.preventDefault()
                            onNlSearchSubmit(local.trim())
                        }}
                        disabled={disabled}
                        readOnly={disabled}
                        placeholder={nlMode
                            ? "Ask in natural language (Enter opens AI chat)…"
                            : "Type keywords (e.g. '911 physics', 'mars water')..."}
                        className="w-full pl-16 pr-6 py-6 bg-slate-100 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-3xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {nlMode && (
                        <span className="absolute -bottom-6 left-0 text-xs text-violet-600 dark:text-violet-400 font-medium">
                            Natural language mode — Enter opens AI chat
                        </span>
                    )}
                    {loading && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin text-blue-500" size={24} />
                        </div>
                    )}
                  </div>
                </div>
            </div>

            {showShortHint && (
                <div className="mx-auto w-full max-w-3xl text-center text-slate-400 text-sm">
                    Please enter at least 2 characters to search...
                </div>
            )}
        </>
    )
})
