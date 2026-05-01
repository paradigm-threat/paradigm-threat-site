'use client'

import React, { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  copyFormatPlatform: SharePlatformId
  onCopyFormatPlatformChange: (platform: SharePlatformId) => void
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
  copyFormatPlatform,
  onCopyFormatPlatformChange,
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

  /** Body portal: main scroll wrapper uses z-0, which trapped fixed content below the sticky header (z-100). */
  const overlay = (
    <div
      className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4"
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 text-sm font-medium hover:opacity-90"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>

          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Text to copy</label>
          <textarea
            readOnly
            value={copyText}
            rows={Math.min(18, Math.max(6, Math.ceil(copyText.length / 72)))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm p-3 font-mono resize-y min-h-[120px]"
            onFocus={(e) => e.target.select()}
          />

          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="share-copy-format"
              className="text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Format for
            </label>
            <select
              id="share-copy-format"
              value={copyFormatPlatform}
              onChange={(e) => onCopyFormatPlatformChange(e.target.value as SharePlatformId)}
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm px-2 py-1"
            >
              <option value="x">X</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="reddit">Reddit</option>
              <option value="bluesky">Bluesky</option>
              <option value="instagram">Instagram</option>
              <option value="substack">Substack</option>
              <option value="threads">Threads</option>
              <option value="truthsocial">Truth Social</option>
            </select>
          </div>

          {ogImageUrl ? (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Article image (OG / first)</p>
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

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open in app or site</p>
            <div className="flex flex-wrap gap-2 select-none [&_*]:select-none">
              {platformActions.map((a) => (
                <React.Fragment key={a.platformId}>
                  {a.href ? (
                    <a
                      href={a.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 leading-tight"
                    >
                      {a.openLabel}
                    </a>
                  ) : null}
                  {a.copyOnlyNote ? (
                    <span className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      {a.platformLabel}: {a.copyOnlyNote}
                    </span>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined' || !document.body) return null
  return createPortal(overlay, document.body)
}
