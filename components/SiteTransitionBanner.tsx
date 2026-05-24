'use client'

import React from 'react'
import { Info } from 'lucide-react'
import {
  isChatDisabled,
  isSearchDisabled,
  isSsrMirrorRedirectEnabled,
} from '@/lib/siteOpsFeature'
import {
  RELAY_TRANSITION_BODY,
  RELAY_TRANSITION_HEADLINE,
} from '@/lib/siteOpsMessages'

/** Shown when any ops flag is active (search, chat, or SSR→mirror redirect). */
export function SiteTransitionBanner () {
  const active =
    isSearchDisabled() || isChatDisabled() || isSsrMirrorRedirectEnabled()
  if (!active) return null

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-sky-200/90 bg-sky-50/95 px-4 py-3 text-sm text-sky-950 shadow-sm dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100"
    >
      <div className="flex gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <div className="space-y-1 min-w-0">
          <p className="font-semibold">{RELAY_TRANSITION_HEADLINE}</p>
          <p className="leading-relaxed opacity-95">{RELAY_TRANSITION_BODY}</p>
        </div>
      </div>
    </div>
  )
}
