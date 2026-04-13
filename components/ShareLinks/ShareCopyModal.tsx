'use client'

import React, { useEffect, useCallback } from 'react'
import { X_URL_WEIGHT } from '@/lib/share/platformLimits'

export interface ShareCopyModalProps {
  open: boolean
  onClose: () => void
  platformLabel: string
  copyText: string
  charCount: number
  /** X/Threads: optional t.co-style weighted length for composer hint */
  xComposerWeight?: number
  outboundHref: string | null
  outboundLabel: string
  ogImageUrl?: string
  copyOnlyNote?: string
  /** True when the Open … link embeds a shorter draft than the copy box */
  outboundOpenUsesShortDraft?: boolean
  intentCharCount?: number
}

export function ShareCopyModal ({
  open,
  onClose,
  platformLabel,
  copyText,
  charCount,
  xComposerWeight,
  outboundHref,
  outboundLabel,
  ogImageUrl,
  copyOnlyNote,
  outboundOpenUsesShortDraft,
  intentCharCount,
}: ShareCopyModalProps) {
  const [copied, setCopied] = React.useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = copyText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }, [copyText])

  if (!open) return null

  const sameSiteDownload =
    typeof window !== 'undefined' &&
    ogImageUrl &&
    (() => {
      try {
        const u = new URL(ogImageUrl)
        return u.hostname === 'paradigmthreat.net' || u.hostname === window.location.hostname
      } catch {
        return false
      }
    })()

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-copy-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 id="share-copy-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Copy & Share — {platformLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {charCount} characters (full text; trim in the app if a network imposes a limit)
            {xComposerWeight != null ? (
              <span className="block mt-1 text-xs text-slate-500">
                X counts each URL as {X_URL_WEIGHT} characters in the composer (~{xComposerWeight} weighted).
              </span>
            ) : null}
          </p>

          {copyOnlyNote ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{copyOnlyNote}</p>
          ) : null}

          {outboundOpenUsesShortDraft && intentCharCount != null ? (
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90 bg-amber-500/10 dark:bg-amber-500/15 rounded-lg px-2 py-1.5">
              The &quot;Open …&quot; button uses a shortened draft ({intentCharCount} characters) so the prefilled post
              fits this network&apos;s compose limit. The text area below is still the full article.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 text-sm font-medium hover:opacity-90"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            {outboundHref ? (
              <a
                href={outboundHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {outboundLabel}
              </a>
            ) : null}
          </div>

          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Text to copy</label>
          <textarea
            readOnly
            value={copyText}
            rows={Math.min(18, Math.max(6, Math.ceil(copyText.length / 72)))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm p-3 font-mono resize-y min-h-[120px]"
            onFocus={(e) => e.target.select()}
          />

          {ogImageUrl ? (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Article image (OG / first)</p>
              <div className="flex flex-wrap items-center gap-2">
                {sameSiteDownload ? (
                  <a
                    href={ogImageUrl}
                    download
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Download image
                  </a>
                ) : (
                  <a
                    href={ogImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Open image
                  </a>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
