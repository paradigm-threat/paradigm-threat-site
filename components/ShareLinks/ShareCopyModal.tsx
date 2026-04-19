'use client'

import React, { useEffect, useCallback, useRef } from 'react'
import { X_URL_WEIGHT } from '@/lib/share/platformLimits'
import type { SharePlatformId } from '@/lib/share'

export interface ShareCopyPlatformAction {
  platformId: SharePlatformId
  platformLabel: string
  href: string | null
  openLabel: string
  copyOnlyNote?: string
  outboundOpenUsesShortDraft: boolean
  intentCharCount?: number
}

export interface ShareCopyModalProps {
  open: boolean
  onClose: () => void
  copyText: string
  charCount: number
  /** X/Threads: optional t.co-style weighted length for composer hint */
  xComposerWeight?: number
  platformActions: ShareCopyPlatformAction[]
  ogImageUrl?: string
}

function getFocusableList (root: HTMLElement): HTMLElement[] {
  const focusables = root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  return Array.from(focusables).filter((el) => !el.hasAttribute('data-focus-guard'))
}

function focusTrapHandler (root: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const list = getFocusableList(root)
  if (list.length === 0) return
  const first = list[0]
  const last = list[list.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (list.length === 1) return
  if (e.shiftKey) {
    if (active === first || (active && !root.contains(active))) {
      e.preventDefault()
      last.focus()
    }
  } else if (active === last) {
    e.preventDefault()
    first.focus()
  }
}

export function ShareCopyModal ({
  open,
  onClose,
  copyText,
  charCount,
  xComposerWeight,
  platformActions,
  ogImageUrl,
}: ShareCopyModalProps) {
  const [copied, setCopied] = React.useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const root = panelRef.current
    if (!root) return
    const list = getFocusableList(root)
    window.setTimeout(() => list[0]?.focus(), 0)
    const onTab = (e: KeyboardEvent) => focusTrapHandler(root, e)
    root.addEventListener('keydown', onTab)
    return () => root.removeEventListener('keydown', onTab)
  }, [open])

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

  const anyShortDraft = platformActions.some((a) => a.outboundOpenUsesShortDraft)

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-copy-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 id="share-copy-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Copy &amp; Share
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
                X and Threads count each URL as {X_URL_WEIGHT} characters in the composer (~{xComposerWeight}{' '}
                weighted for this text).
              </span>
            ) : null}
          </p>

          {anyShortDraft ? (
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90 bg-amber-500/10 dark:bg-amber-500/15 rounded-lg px-2 py-1.5">
              Some &quot;Open …&quot; links use a shortened draft so the prefilled post fits that network&apos;s
              compose limit. The text area below is always the full article. See per-network notes next to each
              link where trimming applies.
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
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open in app or site</p>
            <ul className="flex flex-col gap-2 list-none m-0 p-0">
              {platformActions.map((a) => (
                <li key={a.platformId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                      {a.platformLabel}
                    </span>
                    {a.href ? (
                      <a
                        href={a.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {a.openLabel}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">No web open link — copy below</span>
                    )}
                  </div>
                  {a.outboundOpenUsesShortDraft && a.intentCharCount != null ? (
                    <p className="text-xs text-amber-800/90 dark:text-amber-200/90 pl-0">
                      This open link uses a shortened draft ({a.intentCharCount} characters).
                    </p>
                  ) : null}
                  {a.copyOnlyNote ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{a.copyOnlyNote}</p>
                  ) : null}
                </li>
              ))}
            </ul>
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
