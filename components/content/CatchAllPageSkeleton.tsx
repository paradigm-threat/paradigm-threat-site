import React from 'react'

/**
 * Article-column placeholder sized close to a typical listing/article so
 * skeleton→content does not score a large CLS hit (field ~0.45–0.71).
 * Prefer article-shell-reserve over a full-viewport min height.
 */
export function CatchAllPageSkeleton() {
  return (
    <div
      className="article-shell-reserve w-full animate-pulse"
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
        <div className="mt-8 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[90%] rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[85%] rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[93%] rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-8 h-4 w-[96%] rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[80%] rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-[88%] rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  )
}
