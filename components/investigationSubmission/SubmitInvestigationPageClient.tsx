'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { InvestigationSubmissionForm } from '@/components/investigationSubmission/InvestigationSubmissionForm'
import { InvestigationSubmissionsList } from '@/components/investigationSubmission/InvestigationSubmissionsList'
import { fetchRecentInvestigationSubmissions } from '@/lib/investigationSubmission/clientSubmit'
import type { PublicInvestigationSubmission } from '@/lib/investigationSubmission/validateSubmission'
import { isInvestigationSubmitEnabled } from '@/lib/siteOpsFeature'

export function SubmitInvestigationPageClient () {
  const [submissions, setSubmissions] = useState<PublicInvestigationSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await fetchRecentInvestigationSubmissions(50)
      setSubmissions(list)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load submissions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const onSubmitted = useCallback((submission: PublicInvestigationSubmission) => {
    setSubmissions((prev) => [submission, ...prev.filter((s) => s.id !== submission.id)])
  }, [])

  if (!isInvestigationSubmitEnabled()) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-500">
        Investigation submissions are temporarily unavailable.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-16 py-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Submit an idea for investigation
        </h1>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          Suggest a topic the site should research. Include context, questions, and reference links.
          We store text and URLs only — no image uploads. Submissions appear below after you submit.
        </p>
      </header>

      <InvestigationSubmissionForm onSubmitted={onSubmitted} />

      <section className="space-y-6 pt-8 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent submissions</h2>
        {loadError && (
          <p className="text-sm text-red-500">{loadError}</p>
        )}
        <InvestigationSubmissionsList submissions={submissions} loading={loading} />
      </section>
    </div>
  )
}
