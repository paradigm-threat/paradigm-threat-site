'use client'

import React from 'react'
import { Share2 } from 'lucide-react'
import { ShareCopyModal } from '@/components/ShareLinks/ShareCopyModal'
import { FilePathBreadcrumbs } from '@/components/ShareLinks/FilePathBreadcrumbs'
import type { ShareLinksProps } from '@/components/ShareLinks/types'
import { useShareLinksModel, SHARE_PLATFORMS } from '@/components/ShareLinks/useShareLinksModel'

export type { ShareLinksProps } from '@/components/ShareLinks/types'

/** Keeps chrome out of plain-text selection/copy on the article (`user-select` is not inherited). */
const noSelectSubtree = 'select-none [&_*]:select-none'

export function ShareLinks(props: ShareLinksProps) {
  const {
    modalOpen,
    openModal,
    closeModal,
    activeCopyText,
    charCount,
    copyCharLimit,
    setCopyText,
    xComposerWeight,
    platformOutbounds,
    ogImageUrl,
    copyFormatPlatform,
    setCopyFormatPlatform,
    hasSubstackUrl,
    useSubstackUrlForShare,
    setUseSubstackUrlForShare,
    canRewriteWithAi,
    shareTone,
    setShareTone,
    shareRewriting,
    shareRewriteProgress,
    shareRewriteError,
    rewriteShareCopy,
    resetShareCopy,
    cancelShareRewrite,
    usingAiCopy,
    copyIsEdited,
    relayMdDownload,
  } = useShareLinksModel(props)

  return (
    <div className={`mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 ${noSelectSubtree}`}>
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

      {modalOpen ? (
        <ShareCopyModal
          open
          onClose={closeModal}
          copyText={activeCopyText}
          charCount={charCount}
          copyCharLimit={copyCharLimit}
          onCopyTextChange={setCopyText}
          xComposerWeight={xComposerWeight}
          platformActions={platformOutbounds}
          ogImageUrl={ogImageUrl}
          copyFormatPlatform={copyFormatPlatform}
          onCopyFormatPlatformChange={setCopyFormatPlatform}
          hasSubstackUrl={hasSubstackUrl}
          useSubstackUrlForShare={useSubstackUrlForShare}
          onUseSubstackUrlForShareChange={setUseSubstackUrlForShare}
          canRewriteWithAi={canRewriteWithAi}
          shareTone={shareTone}
          onShareToneChange={setShareTone}
          shareRewriting={shareRewriting}
          shareRewriteProgress={shareRewriteProgress}
          shareRewriteError={shareRewriteError}
          onRewriteShareCopy={() => { void rewriteShareCopy() }}
          onResetShareCopy={resetShareCopy}
          onCancelShareRewrite={cancelShareRewrite}
          usingAiCopy={usingAiCopy}
          copyIsEdited={copyIsEdited}
          relayMdDownload={relayMdDownload}
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
    modalOpen,
    openModal,
    closeModal,
    activeCopyText,
    charCount,
    copyCharLimit,
    setCopyText,
    xComposerWeight,
    platformOutbounds,
    ogImageUrl,
    copyFormatPlatform,
    setCopyFormatPlatform,
    hasSubstackUrl,
    useSubstackUrlForShare,
    setUseSubstackUrlForShare,
    canRewriteWithAi,
    shareTone,
    setShareTone,
    shareRewriting,
    shareRewriteProgress,
    shareRewriteError,
    rewriteShareCopy,
    resetShareCopy,
    cancelShareRewrite,
    usingAiCopy,
    copyIsEdited,
    relayMdDownload,
  } = useShareLinksModel(props)

  return (
    <>
      <div
        className={`flex w-full min-w-0 items-start justify-between gap-4 ${noSelectSubtree}`}
      >
        <FilePathBreadcrumbs url={url} title={title} className="min-w-0 flex-1 pr-2" />
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => openModal('x', 'X')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-200/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700/90"
          >
            <Share2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            Share
          </button>
        </div>
      </div>

      {modalOpen ? (
        <ShareCopyModal
          open
          onClose={closeModal}
          copyText={activeCopyText}
          charCount={charCount}
          copyCharLimit={copyCharLimit}
          onCopyTextChange={setCopyText}
          xComposerWeight={xComposerWeight}
          platformActions={platformOutbounds}
          ogImageUrl={ogImageUrl}
          copyFormatPlatform={copyFormatPlatform}
          onCopyFormatPlatformChange={setCopyFormatPlatform}
          hasSubstackUrl={hasSubstackUrl}
          useSubstackUrlForShare={useSubstackUrlForShare}
          onUseSubstackUrlForShareChange={setUseSubstackUrlForShare}
          canRewriteWithAi={canRewriteWithAi}
          shareTone={shareTone}
          onShareToneChange={setShareTone}
          shareRewriting={shareRewriting}
          shareRewriteProgress={shareRewriteProgress}
          shareRewriteError={shareRewriteError}
          onRewriteShareCopy={() => { void rewriteShareCopy() }}
          onResetShareCopy={resetShareCopy}
          onCancelShareRewrite={cancelShareRewrite}
          usingAiCopy={usingAiCopy}
          copyIsEdited={copyIsEdited}
          relayMdDownload={relayMdDownload}
        />
      ) : null}
    </>
  )
}
