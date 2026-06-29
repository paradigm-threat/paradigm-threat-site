'use client'

import React from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { searchEntryHref } from '@/lib/searchEntryDisplay'
import { isWebMcpActuationEnabled } from '@/lib/siteOpsFeature'
import { feelingLuckyPathToHref } from '@/lib/feelingLucky'

interface SiteAiSearchOpenLinksProps {
  paths: string[]
}

export function SiteAiSearchOpenLinks ({ paths }: SiteAiSearchOpenLinksProps) {
  if (paths.length === 0) return null

  const actuation = isWebMcpActuationEnabled()

  const openPath = (path: string) => {
    const href = feelingLuckyPathToHref(path.replace(/^\//, ''))
    window.location.assign(href.startsWith('/') ? href : `/${href}`)
  }

  return (
    <div className="px-4 py-3 border-t border-slate-800 shrink-0 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Search results</div>
      <div className="flex flex-wrap gap-2">
        {paths.slice(0, 8).map((path) => (
          <div key={path} className="flex items-center gap-1">
            <Link
              href={searchEntryHref(path)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:border-indigo-500 transition-colors max-w-[14rem] truncate"
              title={path}
            >
              <ExternalLink size={12} />
              {path.split('/').pop()?.replace(/\.md$/i, '') ?? path}
            </Link>
            {actuation && (
              <button
                type="button"
                onClick={() => openPath(path)}
                className="rounded-lg border border-violet-600/50 px-2 py-1 text-xs text-violet-200 hover:bg-violet-950/50"
              >
                Open
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
