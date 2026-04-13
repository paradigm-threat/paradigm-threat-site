'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import { ShareCopyModal } from '@/components/ShareLinks/ShareCopyModal'
import { FilePathBreadcrumbs } from '@/components/ShareLinks/FilePathBreadcrumbs'
import type { SharePlatformId } from '@/lib/share'
import type { ShareLinksProps } from '@/components/ShareLinks/types'
import { useShareLinksModel, SHARE_PLATFORMS } from '@/components/ShareLinks/useShareLinksModel'

export type { ShareLinksProps } from '@/components/ShareLinks/types'

const platformButtonClass =
  'inline-flex w-full items-center justify-center rounded border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'

export function ShareLinks(props: ShareLinksProps) {
  const {
    modal,
    openModal,
    closeModal,
    activeCopyText,
    charCount,
    xComposerWeight,
    outbound,
    outboundOpenUsesShortDraft,
    intentCharCount,
    ogImageUrl,
  } = useShareLinksModel(props)

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Share</p>
      <div className="flex flex-wrap gap-2">
        {SHARE_PLATFORMS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => openModal(id, label)}
            className="inline-flex items-center rounded border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {modal ? (
        <ShareCopyModal
          key={modal.platform}
          open
          onClose={closeModal}
          platformLabel={modal.label}
          copyText={activeCopyText}
          charCount={charCount}
          xComposerWeight={xComposerWeight}
          outboundHref={outbound.href}
          outboundLabel={outbound.label}
          ogImageUrl={ogImageUrl}
          copyOnlyNote={outbound.copyOnlyNote}
          outboundOpenUsesShortDraft={outboundOpenUsesShortDraft}
          intentCharCount={intentCharCount}
        />
      ) : null}
    </div>
  )
}

/**
 * Same share flow as {@link ShareLinks}; breadcrumbs + Share dropdown in normal document flow
 * (place inside {@code not-prose} above article body). Bottom {@link ShareLinks} unchanged.
 */
export function ShareLinksFloating(props: ShareLinksProps) {
  const { url, title } = props
  const {
    modal,
    openModal,
    closeModal,
    activeCopyText,
    charCount,
    xComposerWeight,
    outbound,
    outboundOpenUsesShortDraft,
    intentCharCount,
    ogImageUrl,
  } = useShareLinksModel(props)

  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const pickPlatform = (id: SharePlatformId, label: string) => {
    setMenuOpen(false)
    openModal(id, label)
  }

  return (
    <>
      <div
        ref={rootRef}
        className="flex w-full min-w-0 items-start justify-between gap-4"
      >
        <FilePathBreadcrumbs url={url} title={title} className="min-w-0 flex-1 pr-2" />
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-200/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700/90"
          >
            <Share2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            Share
          </button>
          {menuOpen ? (
            <div
              role="menu"
              aria-label="Share on"
              className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,16rem)] rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-slate-900"
            >
              <p className="px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Share
              </p>
              <div className="flex max-h-[min(70vh,24rem)] flex-col gap-1 overflow-y-auto">
                {SHARE_PLATFORMS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    onClick={() => pickPlatform(id, label)}
                    className={platformButtonClass}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {modal ? (
        <ShareCopyModal
          key={modal.platform}
          open
          onClose={closeModal}
          platformLabel={modal.label}
          copyText={activeCopyText}
          charCount={charCount}
          xComposerWeight={xComposerWeight}
          outboundHref={outbound.href}
          outboundLabel={outbound.label}
          ogImageUrl={ogImageUrl}
          copyOnlyNote={outbound.copyOnlyNote}
          outboundOpenUsesShortDraft={outboundOpenUsesShortDraft}
          intentCharCount={intentCharCount}
        />
      ) : null}
    </>
  )
}
