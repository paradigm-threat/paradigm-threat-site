'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useSiteAi } from '@/components/SiteAi/SiteAiProvider'
import { useSiteAiAvailable } from '@/lib/siteAi/useSiteAiAvailable'
import { SITE_AI_SUBMISSION_STARTERS } from '@/lib/siteAi/siteAiSubmissionStarters'
import { isInvestigationSubmitEnabled } from '@/lib/siteOpsFeature'
import type { SiteAiSearchContext } from '@/lib/search/searchChatIntents'

interface SearchSubmitInvestigationCtaProps {
  query: string
  searchContext: SiteAiSearchContext
}

export function SearchSubmitInvestigationCta ({
  query,
  searchContext,
}: SearchSubmitInvestigationCtaProps) {
  const { openModal } = useSiteAi()
  const aiAvailable = useSiteAiAvailable() === 'available'

  if (!isInvestigationSubmitEnabled()) return null
  if (query.trim().length < 2) return null

  const starter = SITE_AI_SUBMISSION_STARTERS[0]

  return (
    <section
      className="max-w-3xl mx-auto pt-8 border-t border-slate-200 dark:border-slate-800 text-center space-y-4"
      aria-label="Submit investigation idea"
    >
      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
        Didn&apos;t find what you&apos;re looking for?{' '}
        <Link href="/submit" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
          Submit your topic for investigation
        </Link>
        .
      </p>
      {aiAvailable && starter && (
        <button
          type="button"
          onClick={() => {
            openModal({
              presentation: 'expanded',
              intent: 'submit-idea',
              searchContext,
              startSubmissionMode: true,
              question: starter.prompt,
              autoSubmit: true,
            })
          }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/40 transition-colors"
        >
          <Sparkles size={16} aria-hidden />
          Discuss with Site AI
        </button>
      )}
    </section>
  )
}
