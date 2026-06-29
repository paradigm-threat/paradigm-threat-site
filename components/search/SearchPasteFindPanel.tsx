'use client'

import React, { useCallback, useState } from 'react'
import Link from 'next/link'
import { FileText, Loader2 } from 'lucide-react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { findArticlesForText } from '@/lib/replyAssistant/findArticlesForText'
import type { SearchContentFilters } from '@/lib/searchIndexFilter'
import { searchEntryHref } from '@/lib/searchEntryDisplay'

interface SearchPasteFindPanelProps {
  filesIndex: IndexedPathEntry[]
  contentFilters: SearchContentFilters
}

export function SearchPasteFindPanel ({ filesIndex, contentFilters }: SearchPasteFindPanelProps) {
  const [sourceText, setSourceText] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ReturnType<typeof findArticlesForText> | null>(null)

  const handleFind = useCallback(() => {
    const text = sourceText.trim()
    if (text.length < 20) return
    setLoading(true)
    queueMicrotask(() => {
      const out = findArticlesForText(filesIndex, {
        sourceText: text,
        maxArticles: 8,
        includeBlog: contentFilters.includeBlog,
        includeCitations: false,
      })
      setResults(out)
      setLoading(false)
    })
  }, [sourceText, filesIndex, contentFilters.includeBlog])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Paste to find</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Paste a paragraph or forum post — we rank site articles by term overlap (no AI required).
        </p>
      </div>
      <textarea
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        rows={8}
        placeholder="Paste at least 20 characters…"
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleFind}
          disabled={sourceText.trim().length < 20 || loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading && <Loader2 className="animate-spin" size={18} />}
          Find articles
        </button>
      </div>
      {results && (
        <div className="space-y-4">
          {results.warnings.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300 text-center">{results.warnings.join(' ')}</p>
          )}
          {results.results.length === 0 ? (
            <p className="text-center text-slate-500">No strong index matches for that text.</p>
          ) : (
            <ul className="space-y-3">
              {results.results.map((r) => (
                <li key={r.path}>
                  <Link
                    href={searchEntryHref(r.path)}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-500 transition-colors group"
                  >
                    <FileText className="shrink-0 text-emerald-500 mt-1" size={20} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {r.title}
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate">{r.path}</div>
                      {r.matchedTerms.length > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          Matched: {r.matchedTerms.slice(0, 6).join(', ')}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
