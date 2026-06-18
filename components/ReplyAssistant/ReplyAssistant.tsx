'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Clipboard, Loader2, Sparkles } from 'lucide-react'
import { AgentProgressPanel } from '@/components/SiteAi/AgentProgressPanel'
import { BrowserAiSetupPanel, BrowserAiUnsupportedPanel } from '@/components/SiteAi/BrowserAiSetupPanel'
import { useAgentProgressDisplay } from '@/components/SiteAi/useAgentProgressDisplay'
import { draftReplyWithBrowserAi } from '@/lib/replyAssistant/draftReplyWithBrowserAi'
import { useReplyDraftingAvailable } from '@/lib/replyAssistant/useReplyDraftingAvailable'
import { useBrowserAiSupport } from '@/lib/browserAi/useBrowserAiSupport'

export function ReplyAssistant () {
  const availability = useReplyDraftingAvailable()
  const support = useBrowserAiSupport()
  const [sourceText, setSourceText] = useState('')
  const [draftText, setDraftText] = useState('')
  const [includeCitations, setIncludeCitations] = useState(false)
  const [tone, setTone] = useState<'conversational' | 'neutral' | 'brief'>('conversational')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [toolLog, setToolLog] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { steps, current, slowHint, onProgress, reset: resetProgress } = useAgentProgressDisplay()

  const ready = availability === 'available'
  const setupMode = availability === 'needs-setup'
  const formDisabled = !ready || drafting

  useEffect(() => {
    const prev = document.title
    document.title = ready
      ? 'Reply assistant — Paradigm Threat'
      : setupMode
        ? 'Reply assistant setup — Paradigm Threat'
        : 'Reply assistant unavailable — Paradigm Threat'
    return () => { document.title = prev }
  }, [ready, setupMode])

  const handlePaste = useCallback(async () => {
    if (!ready) return
    try {
      const text = await navigator.clipboard.readText()
      if (text) setSourceText(text)
      setError(null)
    } catch {
      setError('Could not read clipboard — paste manually with Ctrl+V')
    }
  }, [ready])

  const handleCopyDraft = useCallback(async () => {
    if (!draftText.trim()) return
    try {
      await navigator.clipboard.writeText(draftText)
      setCopied(true)
      setError(null)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Copy failed — select and copy manually')
    }
  }, [draftText])

  const handleDraft = useCallback(async () => {
    if (!ready) return
    if (sourceText.trim().length < 20) {
      setError('Paste at least 20 characters before drafting')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setDrafting(true)
    setError(null)
    setDraftText('')
    setToolLog([])
    resetProgress()

    try {
      const result = await draftReplyWithBrowserAi({
        sourceText,
        includeCitations,
        tone,
        signal: controller.signal,
        onProgress,
      })
      setDraftText(result.draft)
      setToolLog(result.toolCalls.map((t) => `${t.name}(${JSON.stringify(t.arguments)})`))
    } catch (e) {
      if (controller.signal.aborted) return
      setError(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDrafting(false)
      resetProgress()
      abortRef.current = null
    }
  }, [ready, sourceText, includeCitations, tone, onProgress, resetProgress])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    setDrafting(false)
    resetProgress()
  }, [resetProgress])

  if (availability === 'checking') {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking browser AI and WebMCP…
      </div>
    )
  }

  if (availability === 'unavailable') {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4">
        <BrowserAiUnsupportedPanel variant="page" />
      </div>
    )
  }

  const canDraft = ready && sourceText.trim().length >= 20 && !drafting

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reply assistant</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste a forum post, then draft a reply using on-device AI. The assistant searches
          paradigm-threat articles — including Q&amp;A sections — via WebMCP tools before writing.
        </p>
      </header>

      {setupMode && support.status === 'needs-setup' && (
        <div className="rounded-xl border border-violet-500/30 bg-slate-900/40 p-4">
          <BrowserAiSetupPanel reason={support.reason} variant="page" />
        </div>
      )}

      <div className={`space-y-2 ${setupMode ? 'opacity-50 pointer-events-none' : ''}`}>
        <label htmlFor="reply-source" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Post to reply to
        </label>
        <textarea
          id="reply-source"
          rows={10}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Paste the forum post or comment…"
          disabled={formDisabled}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-60"
        />
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => { void handlePaste() }}
            disabled={!ready}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            Paste from clipboard
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={includeCitations}
              onChange={(e) => setIncludeCitations(e.target.checked)}
              disabled={!ready}
            />
            Include article links in draft
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            Tone
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as typeof tone)}
              disabled={!ready}
              className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm disabled:opacity-60"
            >
              <option value="conversational">Conversational</option>
              <option value="neutral">Neutral</option>
              <option value="brief">Brief</option>
            </select>
          </label>
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-3 ${setupMode ? 'opacity-50 pointer-events-none' : ''}`}>
        <button
          type="button"
          disabled={!canDraft}
          onClick={() => { void handleDraft() }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {drafting ? 'Drafting…' : 'Draft reply'}
        </button>
        {drafting && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
          >
            Cancel
          </button>
        )}
      </div>

      <AgentProgressPanel
        active={drafting}
        current={current}
        slowHint={slowHint}
        steps={steps}
      />

      {draftText && (
        <div className="space-y-2">
          <label htmlFor="reply-draft" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Draft reply
          </label>
          <textarea
            id="reply-draft"
            rows={12}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => { void handleCopyDraft() }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Clipboard className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy reply'}
          </button>
        </div>
      )}

      {toolLog.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {showLog ? 'Hide' : 'Show'} investigation log ({toolLog.length} tool calls)
          </button>
          {showLog && (
            <pre className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-400">
              {toolLog.join('\n')}
            </pre>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
      )}
    </div>
  )
}
