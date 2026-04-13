'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useHubResumeChrome } from '@/lib/hooks/useHubResumeChrome'
import { isMarkdownHubPath } from '@/lib/visitResumeStorage'

interface ResumeInvestigationPanelProps {
  className?: string
}

/** Shell + link + dismiss share one border (same footprint as {@link FeelingLuckyButton}). */
function ResumeRowWithDismiss({
  href,
  variant,
  onDismiss,
  children,
}: {
  href: string
  variant: 'primary' | 'secondary'
  onDismiss: () => void
  children: React.ReactNode
}) {
  const shell =
    variant === 'primary'
      ? 'bg-slate-200/80 dark:bg-slate-800/80'
      : 'bg-slate-100/70 dark:bg-slate-900/70'
  const linkTone =
    variant === 'primary'
      ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-300/80 dark:hover:bg-slate-700/80'
      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800/80'

  return (
    <div
      className={`flex min-w-0 items-stretch overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 ${shell}`}
    >
      <Link
        href={href}
        className={`flex min-w-0 flex-1 items-center justify-center px-3 py-2 text-sm font-medium transition-colors ${linkTone} text-center`}
      >
        <span className="min-w-0 truncate">{children}</span>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        className={`flex w-11 shrink-0 items-center justify-center border-l border-slate-300 dark:border-slate-600 ${linkTone}`}
        aria-label="Dismiss resume suggestions"
        title="Dismiss"
      >
        <X className="h-4 w-4 opacity-80" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}

/**
 * Resume last article / TTS playback — shown only on markdown hub routes (`/` and `/book`),
 * inline in the Directory column above "I'm Feeling Lucky" (not in floating overlays).
 */
export function ResumeInvestigationPanel({ className = '' }: ResumeInvestigationPanelProps) {
  const pathname = usePathname()
  const resume = useHubResumeChrome()

  if (!isMarkdownHubPath(pathname)) return null

  const showLinks =
    (resume.showResumePage || resume.showResumePlayback) && !resume.dismissed

  if (!showLinks) return null

  const hasPage = Boolean(resume.showResumePage && resume.last)
  const hasPlayback = Boolean(resume.showResumePlayback && resume.tts)

  const btnSecondaryFull =
    'inline-flex w-full max-w-full items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100/70 dark:bg-slate-900/70 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-colors text-center'

  return (
    <div className={`space-y-2 ${className}`} role="region" aria-label="Resume reading">
      {hasPage && resume.last && (
        <ResumeRowWithDismiss
          href={resume.last.path}
          variant="primary"
          onDismiss={resume.handleDismiss}
        >
          <>
            Resume
            {resume.last.title ? (
              <span className="font-normal opacity-90"> — {resume.last.title}</span>
            ) : null}
          </>
        </ResumeRowWithDismiss>
      )}
      {hasPlayback && resume.tts && (
        hasPage ? (
          <Link href={resume.playbackHref} className={btnSecondaryFull}>
            <span className="truncate">
              Resume playback
              {resume.tts.title && resume.tts.path !== resume.last?.path ? (
                <span className="font-normal opacity-90"> — {resume.tts.title}</span>
              ) : null}
            </span>
          </Link>
        ) : (
          <ResumeRowWithDismiss
            href={resume.playbackHref}
            variant="secondary"
            onDismiss={resume.handleDismiss}
          >
            <>
              Resume playback
              {resume.tts.title && resume.tts.path !== resume.last?.path ? (
                <span className="font-normal opacity-90"> — {resume.tts.title}</span>
              ) : null}
            </>
          </ResumeRowWithDismiss>
        )
      )}
    </div>
  )
}
