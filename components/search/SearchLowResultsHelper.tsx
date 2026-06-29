'use client'

import React from 'react'
import type { LowResultsHints } from '@/lib/search/searchEnhancements'
import { syncSearchUrl } from '@/lib/useSearchUrlState'

interface SearchLowResultsHelperProps {
  hints: LowResultsHints | null
  query: string
}

export function SearchLowResultsHelper ({ hints, query }: SearchLowResultsHelperProps) {
  if (!hints || query.trim().length < 2) return null

  const applyTerm = (term: string) => {
    syncSearchUrl(term)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-4">
      <p className="text-sm text-amber-900 dark:text-amber-200">{hints.message}</p>
      {hints.broadenTerms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hints.broadenTerms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => applyTerm(term)}
              className="rounded-full border border-amber-300/60 dark:border-amber-800 px-3 py-1 text-sm text-amber-950 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      )}
      {hints.claimTitles.length > 0 && (
        <div className="text-xs text-amber-800/80 dark:text-amber-300/80">
          Related site topics: {hints.claimTitles.join(' · ')}
        </div>
      )}
    </div>
  )
}
