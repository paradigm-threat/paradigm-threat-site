'use client'

import React from 'react'
import { FileText } from 'lucide-react'
import { useSiteAi } from '@/components/SiteAi/SiteAiProvider'
import { shouldShowBrowserAiLauncher } from '@/lib/browserAi/detectBrowserAiSupport'
import { useBrowserAiSupport } from '@/lib/browserAi/useBrowserAiSupport'
import { buildSummarizePageQuestion } from '@/lib/siteAi/siteAiPageQuestions'

type SiteAiPageAskButtonProps = {
  className?: string
}

/** One-tap summarize / ask-about-this-page control for article dock. */
export function SiteAiPageAskButton ({ className = '' }: SiteAiPageAskButtonProps) {
  const support = useBrowserAiSupport()
  const { pageContext, openModal } = useSiteAi()

  if (!shouldShowBrowserAiLauncher(support) || !pageContext?.path) return null

  return (
    <button
      type="button"
      onClick={() => {
        openModal({
          question: buildSummarizePageQuestion(pageContext),
          autoSubmit: true,
        })
      }}
      className={`h-12 px-3 rounded-full bg-violet-600/40 hover:bg-violet-500/70 border border-violet-400/30 text-violet-100 flex items-center gap-1.5 shadow-lg transition-all hover:scale-105 text-xs font-medium whitespace-nowrap ${className}`.trim()}
      aria-label={`Summarize ${pageContext.title}`}
      title={`Ask about this page: ${pageContext.title}`}
    >
      <FileText size={16} className="shrink-0" />
      <span className="hidden sm:inline">Summarize page</span>
    </button>
  )
}
