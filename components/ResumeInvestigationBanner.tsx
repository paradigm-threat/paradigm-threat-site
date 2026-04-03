'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { readLastVisit, readTtsResume, type TtsResumePayload } from '@/lib/visitResumeStorage'

function isHomeHub(pathname: string | null): boolean {
  return pathname === '/' || pathname === '/book'
}

export function ResumeInvestigationBanner() {
  const pathname = usePathname()
  const [last, setLast] = useState<{ path: string; title: string | null } | null>(null)
  const [tts, setTts] = useState<TtsResumePayload | null>(null)

  useEffect(() => {
    if (!isHomeHub(pathname)) return
    queueMicrotask(() => {
      setLast(readLastVisit())
      setTts(readTtsResume())
    })
  }, [pathname])

  if (!isHomeHub(pathname)) return null

  const showResumePage = Boolean(last?.path && last.path !== pathname)
  const showResumePlayback = Boolean(tts?.path && tts.sentenceIndex >= 0)

  if (!showResumePage && !showResumePlayback) return null

  const playbackHref = tts ? `${tts.path}?resumeTts=1` : ''

  return (
    <div
      className="mb-6 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
      role="region"
      aria-label="Resume reading"
    >
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        {showResumePage && last && (
          <Link
            href={last.path}
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold px-4 py-2 transition-colors shadow-sm"
          >
            Resume investigation
            {last.title ? (
              <span className="font-normal opacity-90 truncate max-w-[min(100%,14rem)] sm:max-w-[18rem] ml-1.5">
                — {last.title}
              </span>
            ) : null}
          </Link>
        )}
        {showResumePlayback && tts && (
          <Link
            href={playbackHref}
            className="inline-flex items-center justify-center rounded-lg border border-amber-700/30 dark:border-amber-400/40 bg-white/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 font-semibold px-4 py-2 transition-colors"
          >
            Resume playback
            {tts.title && tts.path !== last?.path ? (
              <span className="font-normal opacity-90 truncate max-w-[min(100%,12rem)] sm:max-w-[16rem] ml-1.5">
                — {tts.title}
              </span>
            ) : null}
          </Link>
        )}
      </div>
    </div>
  )
}
