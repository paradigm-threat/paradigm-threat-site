'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

function pathnameFromShareUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return new URL(trimmed).pathname || '/'
    } catch {
      return '/'
    }
  }
  const q = trimmed.split('?')[0] ?? ''
  if (!q || q === '/') return '/'
  return q.startsWith('/') ? q : `/${q}`
}

/** Folder / path segment: hyphens and underscores → spaces (no .md strip). */
function formatSegmentLabel(segment: string): string {
  const decoded = decodeURIComponent(segment)
  return decoded.replace(/[-_]/g, ' ')
}

/**
 * Leaf segment from the URL (e.g. `f.md` → `f`). Breadcrumbs follow the path, not the article
 * headline, so this never duplicates a parent folder when the title matches a folder name.
 */
function formatLeafSegmentLabel(segment: string): string {
  const decoded = decodeURIComponent(segment).replace(/\.md$/i, '')
  return decoded.replace(/[-_]/g, ' ')
}

export interface FilePathBreadcrumbsProps {
  /** Site path, e.g. `/history/foo/bar` (same as ShareLinks `url`) */
  url: string
  /** Current page title — tooltip on the last crumb only; visible label comes from the URL path */
  title: string
  className?: string
}

/**
 * Home → each URL segment. Last crumb uses the path leaf (filename), not the article title,
 * so labels stay consistent with the address bar.
 */
export function FilePathBreadcrumbs({ url, title, className = '' }: FilePathBreadcrumbsProps) {
  const items = useMemo(() => {
    const pathname = pathnameFromShareUrl(url)
    const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean)

    const out: { href: string; label: string; current: boolean }[] = [{ href: '/', label: 'Home', current: false }]

    if (segments.length === 0) {
      out[0] = { href: '/', label: 'Home', current: true }
      return out
    }

    let acc = ''
    for (let i = 0; i < segments.length; i++) {
      acc += `/${segments[i]}`
      const isLast = i === segments.length - 1
      const label = isLast ? formatLeafSegmentLabel(segments[i]) : formatSegmentLabel(segments[i])
      out.push({ href: acc, label, current: isLast })
    }

    return out
  }, [url])

  return (
    <nav className={`min-w-0 ${className}`} aria-label="Breadcrumb">
      <ol className="m-0 list-none flex flex-wrap items-center gap-x-1 gap-y-0.5 p-0 pl-0 text-xs sm:text-sm">
        {items.map((item, i) => (
          <li key={`${item.href}-${i}`} className="flex min-w-0 max-w-full items-center gap-1">
            {i > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
            ) : null}
            {item.current ? (
              <span
                className="truncate font-medium text-slate-800 dark:text-slate-100"
                title={title.trim() || item.label}
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="truncate text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
                title={item.label}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
