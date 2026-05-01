'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'
import { getMergedSearchIndex } from '@/server/remoteFiles'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { filterEntriesByPathQueries, hrefForSearchQuery } from '@/lib/pathSearchQuery'
import { indexedFilesDirectlyUnderDirectory, parentDirectoryFromContentPath } from '@/lib/indexSiblingEntries'
import { SearchResultLinks } from '@/components/search'

const CENSORSHIP_IMAGES = [
  'influence/censorship/github-ban.png',
  'influence/censorship/github-ban2.png',
] as const

/** Permalinks on GitLab (same files in paradigm-threat-files). */
const GITLAB_BLOB_URLS = [
  'https://gitlab.com/clevertree/paradigm-threat-files/-/blob/main/influence/censorship/github-ban.png',
  'https://gitlab.com/clevertree/paradigm-threat-files/-/blob/main/influence/censorship/github-ban2.png',
] as const

function filesAssetUrl(relativePath: string): string {
  const base = getPrimaryFilesBaseUrl()
  return `${base}/${relativePath.replace(/^\//, '')}`
}

export interface ArticleRemote404NoticeProps {
  /** Refetch this route’s article from the API (and re-run directory resolution). */
  onRetry?: () => void
  /** URL path is absent from index.json (vs indexed file missing on mirrors). */
  notInIndex?: boolean
  /** Current article path (no leading slash) for path-derived search. */
  path?: string
}

function PathSearchSuggestions({ path }: { path: string }) {
  const [entries, setEntries] = useState<IndexedPathEntry[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setLoadErr(null)
      }
    })
    getMergedSearchIndex()
      .then((e) => {
        if (cancelled) return
        if (e === null) setLoadErr('Could not load search index')
        else setEntries(e)
      })
      .catch(() => {
        if (!cancelled) setLoadErr('Could not load search index')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const parentDir = useMemo(() => parentDirectoryFromContentPath(path), [path])

  const siblingFiles = useMemo(() => {
    if (!entries) return [] as IndexedPathEntry[]
    return indexedFilesDirectlyUnderDirectory(entries, parentDir)
  }, [entries, parentDir])

  const { results, queryUsed, linkQuery } = useMemo(() => {
    if (!entries) {
      return { results: [] as IndexedPathEntry[], queryUsed: '', linkQuery: '' }
    }
    return filterEntriesByPathQueries(entries, path)
  }, [entries, path])

  if (loading) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
        Loading path-based suggestions…
      </p>
    )
  }
  if (loadErr) return null

  const searchHref = hrefForSearchQuery(linkQuery)

  return (
    <div className="space-y-4 pt-1 border-t border-slate-200/80 dark:border-slate-600/80 mt-4">
      {siblingFiles.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Files in this folder</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            From <span className="font-mono text-slate-600 dark:text-slate-300">{parentDir}/</span>
            {parentDir ? (
              <>
                {' '}
                ·{' '}
                <Link
                  href={`/${parentDir}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open folder
                </Link>
              </>
            ) : null}
          </p>
          <div className="max-h-72 overflow-y-auto pr-1">
            <SearchResultLinks entries={siblingFiles} maxItems={50} className="grid gap-2" />
          </div>
        </div>
      ) : null}

      <div className={siblingFiles.length > 0 ? 'space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-600/80' : 'space-y-3'}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Possible matches from your path
        </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Path tokens were matched against the same index as site search (any token can match; more matches rank
        higher)
        {queryUsed ? (
          <>
            {' '}
            — tokens:{' '}
            <span className="font-mono text-slate-600 dark:text-slate-300">{queryUsed}</span>
            {results.length === 0 ? '; try the full search page' : ''}.
          </>
        ) : (
          '.'
        )}
      </p>
      {results.length > 0 ? (
        <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
          <SearchResultLinks entries={results} maxItems={15} className="grid gap-2" />
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No indexed files matched after trying narrower keywords from this path.
        </p>
      )}
        <div>
          <Link
            href={searchHref}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open full search
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Shown when the article API returns 404 (remote markdown/images unavailable).
 * Not used for directory listings or non-404 errors.
 */
export function ArticleRemote404Notice({
  onRetry,
  notInIndex = false,
  path = '',
}: ArticleRemote404NoticeProps) {
  return (
    <div className="selectable-content py-10 space-y-8 text-left max-w-2xl mx-auto">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 p-6 space-y-4 text-slate-800 dark:text-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Content unavailable (404)</h2>
        {notInIndex && path ? <PathSearchSuggestions path={path} /> : null}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Retry loading this page
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Retry (reload)
            </button>
          )}
        </div>
      </div>

      <div className="text-center pt-2">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          Back to home
        </Link>
      </div>
    </div>
  )
}
