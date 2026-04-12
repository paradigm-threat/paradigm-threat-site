'use client'

import React, { useMemo, useState, useCallback } from 'react'
import {
  composeShareText,
  effectiveLengthX,
  extractShareMetadata,
  platformUsesTruncatedOutboundIntent,
  shareTextCharCount,
  truncateShareTextForOutbound,
  type ShareExtractResult,
  type SharePlatformId,
} from '@/lib/share'
import { REDDIT_TITLE_MAX } from '@/lib/share/platformLimits'
import { ShareCopyModal } from '@/components/ShareLinks/ShareCopyModal'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://paradigmthreat.net'

export interface ShareLinksProps {
  url: string
  title: string
  /** @deprecated optional short line; prefer mdSource + frontmatter for rich share */
  description?: string
  /** Raw markdown body (no YAML) for TL;DR / first paragraph / long body */
  mdSource?: string
  frontmatter?: Record<string, unknown>
  /** Precomputed when SSR already ran extractShareMetadata */
  shareExtract?: ShareExtractResult
  ogImageUrl?: string
}

function buildAbsoluteUrl (path: string): string {
  if (path.startsWith('http')) return path
  const base = SITE_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function buildOutboundHref (
  platform: SharePlatformId,
  absUrl: string,
  title: string,
  /** Text embedded in intent URLs — truncated per platform when needed */
  intentText: string
): { href: string | null; label: string; copyOnlyNote?: string } {
  const encodedUrl = encodeURIComponent(absUrl)

  switch (platform) {
    case 'x':
      return {
        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(intentText)}`,
        label: 'Open X to post',
      }
    case 'facebook':
      return {
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        label: 'Open Facebook share',
      }
    case 'linkedin':
      return {
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        label: 'Open LinkedIn',
      }
    case 'reddit': {
      const t = title.length > REDDIT_TITLE_MAX ? `${title.slice(0, REDDIT_TITLE_MAX - 3)}…` : title
      return {
        href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(t)}`,
        label: 'Open Reddit submit',
      }
    }
    case 'bluesky':
      return {
        href: `https://bsky.app/intent/compose?text=${encodeURIComponent(intentText)}`,
        label: 'Open Bluesky',
      }
    case 'instagram':
      return {
        href: 'https://www.instagram.com/',
        label: 'Open Instagram',
        copyOnlyNote:
          'Instagram has no web link that opens the new-post screen with a filled caption. Copy the text here, then create a post in the app and paste.',
      }
    case 'threads':
      return {
        href: `https://www.threads.net/intent/post?text=${encodeURIComponent(intentText)}`,
        label: 'Open Threads',
      }
    case 'truthsocial':
      return {
        href: `https://truthsocial.com/share?url=${encodedUrl}&text=${encodeURIComponent(intentText)}`,
        label: 'Open Truth Social',
        copyOnlyNote:
          'URL is passed separately. The Open link prefills text trimmed to the official limit when needed (help.truthsocial.com/publishers/share-button/).',
      }
    default:
      return { href: null, label: '' }
  }
}

const PLATFORMS: { id: SharePlatformId; label: string }[] = [
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'threads', label: 'Threads' },
  { id: 'truthsocial', label: 'Truth Social' },
]

export function ShareLinks ({
  url,
  title,
  description,
  mdSource,
  frontmatter,
  shareExtract: shareExtractProp,
  ogImageUrl,
}: ShareLinksProps) {
  const absUrl = buildAbsoluteUrl(url)

  const shareExtract = useMemo(() => {
    if (shareExtractProp) return shareExtractProp
    if (mdSource) {
      return extractShareMetadata({ rawMarkdown: mdSource, frontmatter })
    }
    return {
      snippetPlain: description?.trim() || '',
      hashtagsLine: '',
      articleBodyPlain: '',
    }
  }, [shareExtractProp, mdSource, frontmatter, description])

  const composeInput = useMemo(
    () => ({
      title,
      canonicalUrl: absUrl,
      snippetPlain: shareExtract.snippetPlain,
      hashtagsLine: shareExtract.hashtagsLine,
      articleBodyPlain: shareExtract.articleBodyPlain,
    }),
    [title, absUrl, shareExtract]
  )

  const [modal, setModal] = useState<{
    platform: SharePlatformId
    label: string
  } | null>(null)

  const activeCopyText = useMemo(() => {
    if (!modal) return ''
    return composeShareText(modal.platform, composeInput)
  }, [modal, composeInput])

  const charCount = useMemo(() => {
    if (!modal) return 0
    return shareTextCharCount(activeCopyText)
  }, [modal, activeCopyText])

  const xComposerWeight = useMemo(() => {
    if (!modal) return undefined
    if (modal.platform !== 'x' && modal.platform !== 'threads') return undefined
    return effectiveLengthX(activeCopyText)
  }, [modal, activeCopyText])

  /** Shortened only for intent URLs (X, Threads, Bluesky, Truth Social). */
  const intentTextForOutbound = useMemo(() => {
    if (!modal) return ''
    if (platformUsesTruncatedOutboundIntent(modal.platform)) {
      return truncateShareTextForOutbound(modal.platform, composeInput)
    }
    return ''
  }, [modal, composeInput])

  const outboundOpenUsesShortDraft = useMemo(() => {
    if (!modal || !platformUsesTruncatedOutboundIntent(modal.platform)) return false
    return intentTextForOutbound !== activeCopyText
  }, [modal, intentTextForOutbound, activeCopyText])

  const outbound = useMemo(() => {
    if (!modal) return { href: null as string | null, label: '', copyOnlyNote: undefined as string | undefined }
    const intent =
      platformUsesTruncatedOutboundIntent(modal.platform) ? intentTextForOutbound : activeCopyText
    return buildOutboundHref(modal.platform, absUrl, title, intent)
  }, [modal, absUrl, title, intentTextForOutbound, activeCopyText])

  const openModal = useCallback((platform: SharePlatformId, label: string) => {
    setModal({ platform, label })
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Share</p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(({ id, label }) => (
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
          intentCharCount={outboundOpenUsesShortDraft ? shareTextCharCount(intentTextForOutbound) : undefined}
        />
      ) : null}
    </div>
  )
}
