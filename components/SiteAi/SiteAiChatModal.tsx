'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Send, Sparkles, Trash2, X } from 'lucide-react'
import { AgentProgressPanel } from '@/components/SiteAi/AgentProgressPanel'
import { BrowserAiSetupPanel } from '@/components/SiteAi/BrowserAiSetupPanel'
import { useAgentProgressDisplay } from '@/components/SiteAi/useAgentProgressDisplay'
import { useSiteAi } from '@/components/SiteAi/SiteAiProvider'
import { useBrowserAiSupport } from '@/lib/browserAi/useBrowserAiSupport'
import { askSiteAi } from '@/lib/siteAi/askSiteAi'
import { SITE_AI_EXAMPLE_QUESTIONS } from '@/lib/siteAi/siteAiExampleQuestions'

export function SiteAiChatModal () {
  const { open, closeModal, messages, appendExchange, clearHistory, pageContext } = useSiteAi()
  const support = useBrowserAiSupport()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { steps, current, slowHint, onProgress, reset: resetProgress } = useAgentProgressDisplay()

  const setupMode = support.status === 'needs-setup'
  const ready = support.status === 'ready'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeModal])

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [open, messages, loading, steps, current, setupMode])

  const handleClose = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setPendingQuestion(null)
    resetProgress()
    closeModal()
  }, [closeModal, resetProgress])

  const handleSubmit = useCallback(async (questionOverride?: string) => {
    if (!ready) return
    const question = (questionOverride ?? input).trim()
    if (question.length < 3 || loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setPendingQuestion(question)
    resetProgress()
    setInput('')

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const answer = await askSiteAi({
        question,
        history,
        pageContext,
        signal: controller.signal,
        onProgress,
      })
      appendExchange(question, answer)
      setPendingQuestion(null)
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Could not get an answer')
        setInput(question)
        setPendingQuestion(null)
      }
    } finally {
      setLoading(false)
      resetProgress()
      abortRef.current = null
    }
  }, [ready, input, loading, messages, pageContext, appendExchange, onProgress, resetProgress])

  const showEmptyState = messages.length === 0 && !loading

  if (!open || !mounted) return null

  const modal = (
    <div
      className="fixed inset-0 z-[210] flex items-end md:items-center justify-center p-2 md:p-6 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-ai-title"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="flex flex-col w-full max-w-3xl h-[92vh] md:h-[88vh] rounded-2xl border border-slate-700/60 bg-slate-950 shadow-2xl overflow-hidden">
        <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3 shrink-0">
          <Sparkles className="h-5 w-5 text-indigo-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id="site-ai-title" className="text-sm font-semibold text-slate-100">
              Ask Paradigm Threat
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {setupMode
                ? 'Setup required · desktop Chrome with on-device AI'
                : `On-device AI · searches site Q&A and articles${pageContext?.title ? ` · ${pageContext.title}` : ''}`}
            </p>
          </div>
          {!setupMode && (
            <button
              type="button"
              onClick={clearHistory}
              disabled={messages.length === 0 || loading}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              aria-label="Clear chat history"
              title="Clear history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {setupMode ? (
          <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
            <BrowserAiSetupPanel
              reason={support.reason}
              variant="modal"
            />
          </div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              {showEmptyState && (
                <div className="space-y-5 py-6">
                  <p className="text-sm text-slate-500 text-center">
                    Ask anything about the site — history, science, chronology, or a specific article.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SITE_AI_EXAMPLE_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => { void handleSubmit(question) }}
                        disabled={!ready}
                        className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-left text-xs text-slate-300 hover:border-indigo-500/50 hover:bg-indigo-950/40 hover:text-slate-100 disabled:opacity-50 transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/50'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && pendingQuestion && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-indigo-600 text-white opacity-80">
                    {pendingQuestion}
                  </div>
                </div>
              )}
              {loading && (
                <div className="flex justify-start max-w-[90%]">
                  <AgentProgressPanel
                    active
                    current={current}
                    slowHint={slowHint}
                    steps={steps}
                    variant="panel"
                    className="w-full border-slate-700/50 bg-slate-900/80"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="px-4 text-sm text-red-400 shrink-0" role="alert">{error}</p>
            )}

            <form
              className="border-t border-slate-800 p-3 flex gap-2 shrink-0"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSubmit()
              }}
            >
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSubmit()
                  }
                }}
                placeholder="Ask a question…"
                disabled={loading || !ready}
                className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !ready || input.trim().length < 3}
                className="self-end rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50 hover:bg-indigo-500"
                aria-label="Send"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
