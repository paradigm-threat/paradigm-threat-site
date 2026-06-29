'use client'

import React, { useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { useSiteAi } from '@/components/SiteAi/SiteAiProvider'
import { useSiteAiAvailable } from '@/lib/siteAi/useSiteAiAvailable'
import { buildSearchChatIntent } from '@/lib/search/searchChatIntents'
import type { SiteAiSearchContext } from '@/lib/search/searchChatIntents'
import { buildSearchFollowUpQuestions, type LowResultsHints } from '@/lib/search/searchEnhancements'
import { SearchLowResultsHelper } from '@/components/search/SearchLowResultsHelper'

interface SearchAiLaunchBarProps {
  query: string
  searchContext: SiteAiSearchContext
  relatedKeywords: string[]
  hasResults: boolean
  lowResultsHints?: LowResultsHints | null
}

export function SearchAiLaunchBar ({
  query,
  searchContext,
  relatedKeywords,
  hasResults,
  lowResultsHints = null,
}: SearchAiLaunchBarProps) {
  const availability = useSiteAiAvailable()
  const { openModal } = useSiteAi()
  const aiAvailable = availability === 'available'
  const cleanQuery = query.trim()

  const launch = useCallback((intent: 'explain-results' | 'deep-dive' | 'ask' | 'follow-up', question?: string) => {
    const built = buildSearchChatIntent({
      intent,
      question,
      searchContext,
    })
    openModal({
      presentation: 'expanded',
      intent,
      searchContext,
      question: built.userMessage,
      autoSubmit: true,
    })
  }, [openModal, searchContext])

  if (cleanQuery.length < 2) return null
  if (!aiAvailable && !lowResultsHints) return null

  const followUps = aiAvailable ? buildSearchFollowUpQuestions(query, relatedKeywords) : []

  return (
    <section
      className="max-w-3xl mx-auto pt-12 border-t border-slate-200 dark:border-slate-800 space-y-6"
      aria-label="Site AI search tools"
    >
      {aiAvailable && (
        <div className="flex items-center justify-center gap-2 text-violet-400">
          <Sparkles size={18} aria-hidden />
          <h2 className="text-sm font-bold uppercase tracking-wider">Site AI</h2>
        </div>
      )}

      <SearchLowResultsHelper hints={lowResultsHints} query={cleanQuery} />

      {aiAvailable && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {hasResults && (
              <button
                type="button"
                onClick={() => launch('explain-results')}
                className="inline-flex items-center gap-2 rounded-full border border-violet-500/50 bg-violet-950/40 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-900/50 transition-colors"
              >
                <Sparkles size={16} />
                Explain results
              </button>
            )}
            <button
              type="button"
              onClick={() => launch('deep-dive')}
              className="rounded-full border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-500/50 transition-colors"
            >
              Investigation deep-dive
            </button>
            <button
              type="button"
              onClick={() => launch('ask')}
              className="rounded-full border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-500/50 transition-colors"
            >
              Ask AI
            </button>
          </div>
          {followUps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Continue in AI</div>
              <div className="flex flex-wrap justify-center gap-2">
                {followUps.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => launch('follow-up', q)}
                    className="rounded-full border border-indigo-500/40 bg-indigo-950/30 px-3 py-1.5 text-left text-xs text-indigo-100 hover:border-indigo-400/60 transition-colors max-w-md truncate"
                    title={q}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
