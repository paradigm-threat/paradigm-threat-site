'use client'

import React, { useCallback, useState } from 'react'
import { Clipboard, Loader2, Search } from 'lucide-react'
import { fetchMergedSearchIndexClient } from '@/lib/clientMergedSearchIndex'
import { draftReplyToText } from '@/lib/replyAssistant/draftReply'
import { findArticlesForText } from '@/lib/replyAssistant/findArticlesForText'
import { fetchArticleMarkdown } from '@/lib/webmcp/fetchArticle'

export function ReplyAssistant () {
  const [sourceText, setSourceText] = useState('')
  const [includeCitations, setIncludeCitations] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewHits, setPreviewHits] = useState<ReturnType<typeof findArticlesForText> | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setSourceText(text)
    } catch {
      setError('Could not read clipboard — paste manually with Ctrl+V')
    }
  }, [])

  const handleFindSources = useCallback(async () => {
    setError(null)
    setLoading(true)
    setPreviewHits(null)
    try {
      const index = await fetchMergedSearchIndexClient()
      if (!index?.length) {
        setError('Search index unavailable')
        return
      }
      const result = findArticlesForText(index, {
        sourceText,
        maxArticles: 5,
        includeCitations,
      })
      setPreviewHits(result)
      setWarnings(result.warnings)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Find sources failed')
    } finally {
      setLoading(false)
    }
  }, [sourceText, includeCitations])

  const handleGenerateDraft = useCallback(async () => {
    setError(null)
    setLoading(true)
    setReplyDraft('')
    try {
      const index = await fetchMergedSearchIndexClient()
      if (!index?.length) {
        setError('Search index unavailable')
        return
      }
      const result = await draftReplyToText(
        index,
        { sourceText, maxArticles: 3, includeCitations, tone: 'conversational' },
        fetchArticleMarkdown
      )
      setReplyDraft(result.replyDraft)
      setWarnings(result.warnings)
      setPreviewHits({
        extractedQueries: result.extractedQueries,
        results: result.articlesUsed.map((a) => ({
          path: a.path,
          title: a.title,
          score: 1,
          matchedTerms: [],
          canonicalUrl: a.canonicalUrl,
        })),
        warnings: result.warnings,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setLoading(false)
    }
  }, [sourceText, includeCitations])

  const handleCopy = useCallback(async () => {
    if (!replyDraft) return
    try {
      await navigator.clipboard.writeText(replyDraft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Copy failed — select and copy manually')
    }
  }, [replyDraft])

  const canRun = sourceText.trim().length >= 20

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reply assistant</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste text from a forum post or comment. We find relevant articles and draft a reply you can edit and copy.
          Link citations are optional and off by default.
        </p>
      </header>

      <div className="space-y-2">
        <label htmlFor="reply-source" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Text to reply to
        </label>
        <textarea
          id="reply-source"
          rows={8}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Paste the post or comment you want to respond to…"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => { void handlePaste() }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Paste from clipboard
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={includeCitations}
              onChange={(e) => setIncludeCitations(e.target.checked)}
            />
            Include article links in draft
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canRun || loading}
          onClick={() => { void handleFindSources() }}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Find sources
        </button>
        <button
          type="button"
          disabled={!canRun || loading}
          onClick={() => { void handleGenerateDraft() }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Generate draft
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
      )}

      {warnings.length > 0 && (
        <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-5">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      {previewHits && previewHits.results.length > 0 && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <h2 className="text-sm font-semibold">Matched articles</h2>
          <ul className="text-sm space-y-1">
            {previewHits.results.map((r) => (
              <li key={r.path}>
                <span className="font-medium">{r.title}</span>
                <span className="text-slate-500 dark:text-slate-400"> — {r.path}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {replyDraft && (
        <section className="space-y-2">
          <label htmlFor="reply-draft" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Draft reply
          </label>
          <textarea
            id="reply-draft"
            rows={10}
            readOnly
            value={replyDraft}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => { void handleCopy() }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium"
          >
            <Clipboard className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </section>
      )}
    </div>
  )
}
