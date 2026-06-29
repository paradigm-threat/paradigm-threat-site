'use client'

import React from 'react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { SearchResultLinks } from '@/components/search/SearchResultLinks'

interface SearchSuggestedSectionProps {
  entries: IndexedPathEntry[]
}

export function SearchSuggestedSection ({ entries }: SearchSuggestedSectionProps) {
  if (entries.length === 0) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-2 h-8 bg-sky-500 rounded-full" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Suggested</h2>
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-bold text-slate-500">
          {entries.length}
        </span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        Ranked by relevance — may include strong matches worth reading even when keyword order differs.
      </p>
      <SearchResultLinks entries={entries} maxItems={entries.length} />
    </div>
  )
}
