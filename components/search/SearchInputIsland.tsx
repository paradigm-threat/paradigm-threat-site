'use client'

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { SearchHeader } from '@/components/search/SearchHeader'
import type { MutableRefObject } from 'react'
import { syncSearchUrl, subscribeToSearchUrlPopstate } from '@/lib/useSearchUrlState'

export interface SearchInputIslandProps {
  initialQuery: string
  loading: boolean
  /**
   * A stable ref from the parent that receives the debounced query (120ms).
   * Using a ref avoids changing callback identity on every parent re-render.
   */
  onDebouncedQueryRef: MutableRefObject<(q: string) => void>
}

export const SearchInputIsland = memo(function SearchInputIsland({
  initialQuery,
  loading,
  onDebouncedQueryRef,
}: SearchInputIslandProps) {
  // This drives the input's displayed value when navigating back/forward.
  // Typing does NOT update this state, so the island won't re-render per keystroke.
  const [urlQuery, setUrlQuery] = useState(initialQuery)

  useEffect(() => {
    // If the user uses back/forward, keep the input in sync.
    return subscribeToSearchUrlPopstate((q) => {
      setUrlQuery(q)
      onDebouncedQueryRef.current(q)
    })
  }, [onDebouncedQueryRef])

  const onDebouncedSearchQuery = useCallback(
    (trimmed: string) => {
      onDebouncedQueryRef.current(trimmed)
    },
    [onDebouncedQueryRef]
  )

  const onDebouncedUrl = useCallback((trimmed: string) => {
    syncSearchUrl(trimmed)
  }, [])

  // Keep the SearchHeader from re-mounting when the parent re-renders.
  const stableInitialQuery = useMemo(() => initialQuery, [initialQuery])

  return (
    <SearchHeader
      initialQuery={urlQuery || stableInitialQuery}
      loading={loading}
      onDebouncedSearchQuery={onDebouncedSearchQuery}
      onDebouncedUrl={onDebouncedUrl}
    />
  )
}, (prev, next) => {
  return (
    prev.initialQuery === next.initialQuery &&
    prev.loading === next.loading &&
    prev.onDebouncedQueryRef === next.onDebouncedQueryRef
  )
})

