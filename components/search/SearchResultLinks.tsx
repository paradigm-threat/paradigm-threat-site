'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, Image as ImageIcon } from 'lucide-react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { feelingLuckyPathToHref } from '@/lib/feelingLucky'

function isImagePath(path: string): boolean {
  return /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(path)
}

export interface SearchResultLinksProps {
  entries: IndexedPathEntry[]
  /** Max rows to render; no "showing first N" footer when omitted or >= entries.length */
  maxItems?: number
  className?: string
}

/**
 * Shared file/article hit list used by {@link FileSearchForm} and path-based 404 hints.
 */
export function SearchResultLinks({ entries, maxItems, className }: SearchResultLinksProps) {
  const limit = maxItems !== undefined ? maxItems : entries.length
  const rows = entries.slice(0, limit)
  const gridClass = className ?? 'grid gap-2'

  return (
    <div className={gridClass}>
      {rows.map((entry) => (
        <Link
          key={entry.path}
          href={feelingLuckyPathToHref(entry.path)}
          className="flex items-center gap-4 p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-colors">
            {isImagePath(entry.path) ? <ImageIcon size={20} /> : <FileText size={20} />}
          </div>
          <div className="flex-grow min-w-0">
            <div className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {entry.path.split('/').pop()?.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-slate-400 truncate">{entry.path}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}
