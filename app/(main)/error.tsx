'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'

export default function MainSegmentError ({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[main-segment-error]', error)
    }
  }, [error])

  return (
    <div className="not-prose mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-red-300/80 bg-red-50/95 p-8 shadow-sm dark:border-red-900/60 dark:bg-red-950/50">
        <h1 className="text-xl font-bold text-red-950 dark:text-red-50">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-red-900 dark:text-red-100">
          {error.message || 'An unexpected error occurred in this section.'}
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-red-800/80 dark:text-red-200/80">
            Digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Search
          </Link>
        </div>
      </div>
    </div>
  )
}
