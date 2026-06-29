'use client'

import React, { useCallback, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { postInvestigationSubmission } from '@/lib/investigationSubmission/clientSubmit'
import type { PublicInvestigationSubmission } from '@/lib/investigationSubmission/validateSubmission'

export function InvestigationSubmissionForm ({
  onSubmitted,
}: {
  onSubmitted: (submission: PublicInvestigationSubmission) => void
}) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [urlRows, setUrlRows] = useState<string[]>([''])
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const addUrlRow = () => setUrlRows((rows) => [...rows, ''])
  const removeUrlRow = (idx: number) => {
    setUrlRows((rows) => rows.filter((_, i) => i !== idx))
  }
  const updateUrl = (idx: number, value: string) => {
    setUrlRows((rows) => rows.map((r, i) => (i === idx ? value : r)))
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const submission = await postInvestigationSubmission({
        topic,
        description,
        urls: urlRows.filter((u) => u.trim()),
        is_anonymous: isAnonymous,
        email: isAnonymous ? null : email,
        source: 'form',
        website,
      })
      setSuccess('Thank you — your idea was submitted.')
      setTopic('')
      setDescription('')
      setUrlRows([''])
      setEmail('')
      setWebsite('')
      onSubmitted(submission)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setLoading(false)
    }
  }, [topic, description, urlRows, isAnonymous, email, website, onSubmitted])

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-6">
      <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden>
        <label htmlFor="submit-website">Website</label>
        <input
          id="submit-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="submit-topic" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Topic
        </label>
        <input
          id="submit-topic"
          required
          minLength={3}
          maxLength={200}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-slate-100"
          placeholder="e.g. Staged assassination patterns in the 1960s"
        />
      </div>

      <div>
        <label htmlFor="submit-description" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Description
        </label>
        <textarea
          id="submit-description"
          required
          minLength={20}
          maxLength={5000}
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-slate-100"
          placeholder="What should we investigate? Why does it matter? What evidence or angles should we consider?"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
          Reference URLs (optional)
        </legend>
        {urlRows.map((url, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => updateUrl(idx, e.target.value)}
              placeholder="https://…"
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
            {urlRows.length > 1 && (
              <button
                type="button"
                onClick={() => removeUrlRow(idx)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Remove URL"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        {urlRows.length < 10 && (
          <button
            type="button"
            onClick={addUrlRow}
            className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <Plus size={16} />
            Add URL
          </button>
        )}
      </fieldset>

      <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-900/40">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded border-slate-400"
          />
          Submit anonymously
        </label>
        {!isAnonymous && (
          <div>
            <label htmlFor="submit-email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Email (optional contact — not shown publicly)
            </label>
            <input
              id="submit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{success}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-8 py-3 transition-colors"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : null}
        Submit idea
      </button>
    </form>
  )
}
