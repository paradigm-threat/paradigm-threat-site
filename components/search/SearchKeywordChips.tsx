'use client'

import React from 'react'
import { syncSearchUrl } from '@/lib/useSearchUrlState'

interface SearchKeywordChipsProps {
  keywords: string[]
  query: string
  label?: string
}

export function SearchKeywordChips ({ keywords, query, label = 'Related' }: SearchKeywordChipsProps) {
  if (keywords.length === 0 || query.trim().length < 2) return null

  const appendTerm = (term: string) => {
    const terms = new Set(query.trim().split(/\s+/).filter(Boolean))
    if (terms.has(term.toLowerCase())) return
    terms.add(term)
    syncSearchUrl(Array.from(terms).join(' '))
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <button
            key={kw}
            type="button"
            onClick={() => appendTerm(kw)}
            className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            + {kw}
          </button>
        ))}
      </div>
    </div>
  )
}
