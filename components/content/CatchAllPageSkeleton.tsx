import React from 'react'

/**
 * Article-column placeholder (not min-h-screen) so the swap to markdown
 * does not score a full-viewport CLS hit.
 */
export function CatchAllPageSkeleton() {
  return (
    <div
      className="w-full min-h-[20rem] animate-pulse"
      aria-busy="true"
      aria-label="Loading article"
    >
      <div className="mb-6 h-10 max-w-xl rounded-md bg-slate-200 md:h-12 dark:bg-slate-800" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[94%] rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[88%] rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[92%] rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[70%] rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  )
}
