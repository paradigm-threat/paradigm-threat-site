'use client'

import React, { useCallback, useState } from 'react'
import { Clipboard, ExternalLink } from 'lucide-react'
import { buildReplyAgentPrompt } from '@/lib/replyAssistant/agentPrompt'
import { useReplyAssistantAvailable } from '@/lib/replyAssistant/useReplyAssistantAvailable'

function ReplyUnavailable () {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12 px-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reply assistant unavailable</h1>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        This feature requires an AI agent with native WebMCP support (for example Gemini in Chrome).
        It is not available in browsers without <code className="text-xs">document.modelContext</code>.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-400">
        <li>Use Chrome with WebMCP enabled (origin trial or <code className="text-xs">chrome://flags/#enable-webmcp-testing</code> in dev).</li>
        <li>Ensure <code className="text-xs">NEXT_PUBLIC_WEBMCP_ENABLED=1</code> is set for this deployment.</li>
        <li>Open Gemini in Chrome on this tab, then return here.</li>
      </ol>
      <p className="text-sm text-slate-500 dark:text-slate-500">
        Without an agent, the site does not bulk-fetch articles — investigation is agent-led only.
      </p>
    </div>
  )
}

export function ReplyAssistant () {
  const agentAvailable = useReplyAssistantAvailable()
  const [sourceText, setSourceText] = useState('')
  const [includeCitations, setIncludeCitations] = useState(false)
  const [tone, setTone] = useState<'conversational' | 'neutral' | 'brief'>('conversational')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setSourceText(text)
      setError(null)
    } catch {
      setError('Could not read clipboard — paste manually with Ctrl+V')
    }
  }, [])

  const handleCopyPrompt = useCallback(async () => {
    if (sourceText.trim().length < 20) {
      setError('Paste at least 20 characters before copying the agent prompt')
      return
    }
    const prompt = buildReplyAgentPrompt({ sourceText, includeCitations, tone })
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setError(null)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Copy failed — select and copy manually')
    }
  }, [sourceText, includeCitations, tone])

  if (!agentAvailable) {
    return <ReplyUnavailable />
  }

  const canCopy = sourceText.trim().length >= 20

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reply assistant</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste a forum post, then ask Gemini in Chrome to draft a reply using this site&apos;s WebMCP tools.
          The copied prompt includes Paradigm Threat&apos;s perspective on history, science, and technology.
          The agent searches the index, reads articles on demand, and drafts prose — citations optional.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Workflow</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
          <li>Paste the post below.</li>
          <li>Copy the agent prompt (or paste the text into Gemini directly).</li>
          <li>Open Gemini in Chrome on this tab and send the prompt.</li>
          <li>Let the agent call <code className="text-xs">search_site</code>, <code className="text-xs">read_article</code>, etc.</li>
          <li>Copy the finished reply from Gemini.</li>
        </ol>
      </section>

      <div className="space-y-2">
        <label htmlFor="reply-source" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Post to reply to
        </label>
        <textarea
          id="reply-source"
          rows={10}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Paste the forum post or comment…"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-4">
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
            Ask agent to include article links
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            Tone
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as typeof tone)}
              className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
            >
              <option value="conversational">Conversational</option>
              <option value="neutral">Neutral</option>
              <option value="brief">Brief</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canCopy}
          onClick={() => { void handleCopyPrompt() }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Clipboard className="h-4 w-4" />
          {copied ? 'Prompt copied!' : 'Copy agent prompt'}
        </button>
        <a
          href="https://developer.chrome.com/docs/ai/webmcp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          WebMCP docs
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-500">
        No articles are fetched until the agent calls <code className="text-xs">read_article</code> on paths it chooses.
      </p>
    </div>
  )
}
