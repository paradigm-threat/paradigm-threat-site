'use client'

import React from 'react'
import { useFiles } from '@/components/FilesContext'

/** Shown when index.json fails or times out; retry is the primary recovery path. */
export function RemoteFileIndexBanner() {
  const { loading, error, fileList, retryLoadIndex } = useFiles()

  if (loading || !error || fileList) return null

  return (
    <div
      className="w-full max-w-[90rem] mx-auto mb-6 rounded-lg border border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/40 px-4 py-3 text-amber-950 dark:text-amber-100 shadow-sm"
      role="alert"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed pr-2">{error}</p>
        <button
          type="button"
          onClick={retryLoadIndex}
          className="shrink-0 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
