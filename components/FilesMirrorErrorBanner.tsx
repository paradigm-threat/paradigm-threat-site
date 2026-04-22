'use client'

import React, { useState } from 'react'
import { useFiles } from '@/components/FilesContext'

/**
 * Dismissible banner when the file index could not be loaded from relay mirrors.
 * Parent should pass `key={filesError ?? 'ok'}` so a new error remounts and clears dismiss.
 */
export function FilesMirrorErrorBanner () {
  const { error, loading } = useFiles()
  const [dismissed, setDismissed] = useState(false)

  if (loading || !error || dismissed) return null

  return (
    <div
      className="border-b border-amber-300/80 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-50"
      role="status"
    >
      <div className="mx-auto flex max-w-7xl min-w-0 flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm leading-relaxed">{error}</p>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-amber-400/80 bg-white/80 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
