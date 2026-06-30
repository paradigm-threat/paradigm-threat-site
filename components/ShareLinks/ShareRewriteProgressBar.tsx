'use client'

import React from 'react'
import type { ShareRewriteProgress } from '@/lib/share/draftShareTextWithBrowserAi'

type ShareRewriteProgressBarProps = {
  progress: ShareRewriteProgress
}

/** Shown only while share AI rewrite is in flight. */
export function ShareRewriteProgressBar ({ progress }: ShareRewriteProgressBarProps) {
  const { message, percent } = progress
  const determinate = percent != null && percent >= 0

  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2 space-y-1.5">
      <p className="text-xs text-violet-800 dark:text-violet-200 truncate" aria-live="polite">
        {message}
        {determinate ? ` (${percent}%)` : ''}
      </p>
      <div
        role="progressbar"
        aria-label={message}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? percent : undefined}
        className="relative h-1.5 overflow-hidden rounded-full bg-violet-950/20 dark:bg-violet-950/50"
      >
        {determinate ? (
          <div
            className="h-full rounded-full bg-violet-500 transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div className="h-full w-full origin-left scale-x-50 animate-pulse rounded-full bg-violet-500" />
        )}
      </div>
    </div>
  )
}
