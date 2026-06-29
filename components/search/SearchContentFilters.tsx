'use client'

import React from 'react'
import type { SearchContentFilters } from '@/lib/searchIndexFilter'

interface SearchContentFiltersProps {
  filters: SearchContentFilters
  onChange: (filters: SearchContentFilters) => void
  className?: string
  nlMode?: boolean
  onNlModeChange?: (enabled: boolean) => void
  showNlToggle?: boolean
}

export function SearchContentFiltersBar({
  filters,
  onChange,
  className,
  nlMode = false,
  onNlModeChange,
  showNlToggle = false,
}: SearchContentFiltersProps) {
  const rootClass = className ?? 'flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm'

  return (
    <div className={rootClass} role="group" aria-label="Search content filters">
      <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
        <input
          type="checkbox"
          checked={filters.includeBlog}
          onChange={(e) => onChange({ ...filters, includeBlog: e.target.checked })}
          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500/50"
        />
        <span>Include blog posts</span>
      </label>
      <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
        <input
          type="checkbox"
          checked={filters.includeNonArticleMd}
          onChange={(e) => onChange({ ...filters, includeNonArticleMd: e.target.checked })}
          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500/50"
        />
        <span>Include section pages (page.md, index.md)</span>
      </label>
      {showNlToggle && onNlModeChange && (
        <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={nlMode}
            onChange={(e) => onNlModeChange(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500/50"
          />
          <span>Natural language (Enter opens AI)</span>
        </label>
      )}
    </div>
  )
}
