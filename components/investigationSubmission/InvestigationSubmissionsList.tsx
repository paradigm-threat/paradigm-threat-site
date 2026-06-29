'use client'

import React from 'react'
import type { PublicInvestigationSubmission } from '@/lib/investigationSubmission/validateSubmission'

/** Public list — links only, never images or embeds. */
export function InvestigationSubmissionsList ({
  submissions,
  loading = false,
}: {
  submissions: PublicInvestigationSubmission[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200/50 dark:bg-slate-800/50" />
        ))}
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400 py-8">
        No submissions yet. Be the first to suggest a topic.
      </p>
    )
  }

  return (
    <ul className="space-y-6">
      {submissions.map((item) => (
        <li
          key={item.id}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.topic}</h3>
            <time
              className="text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0"
              dateTime={item.created_at}
            >
              {new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </time>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-3">
            {item.description}
          </p>
          {item.urls.length > 0 && (
            <ul className="space-y-1 text-sm">
              {item.urls.map((url) => (
                <li key={url} className="truncate">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] uppercase tracking-wider text-slate-400">
            {item.is_anonymous ? 'Anonymous' : 'Contact provided (private)'}
          </p>
        </li>
      ))}
    </ul>
  )
}
