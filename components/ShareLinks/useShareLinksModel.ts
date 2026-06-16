'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  composeShareText,
  effectiveLengthX,
  extractShareMetadata,
  fitComposeShareToCharLimit,
  platformUsesTruncatedOutboundIntent,
  shareTextCharCount,
  truncateShareTextForOutbound,
  type SharePlatformId,
} from '@/lib/share'
import { REDDIT_TITLE_MAX, platformModalCopyLimit } from '@/lib/share/platformLimits'
import type { ShareLinksProps } from '@/components/ShareLinks/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://paradigmthreat.net'

export function buildAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) return path
  const base = SITE_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function buildOutboundHref(
  platform: SharePlatformId,
  absUrl: string,
  title: string,
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
    case 'substack':
      return {
        href: 'https://substack.com/notes',
        label: 'Open Substack Notes',
        copyOnlyNote:
          'Substack does not provide a stable web link that opens a new Note with prefilled text. Copy the text here, then create a Note and paste.',
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
    case 'nextdoor':
      return {
        href: `https://nextdoor.com/sharekit/?source=paradigmthreat&body=${encodeURIComponent(intentText)}`,
        label: 'Open Nextdoor',
        copyOnlyNote:
          'The Open link prefills text trimmed to Nextdoor’s ShareKit limit (3,500 chars) when needed. Include a URL in the body for a smartlink preview.',
      }
    default:
      return { href: null, label: '' }
  }
}

export const SHARE_PLATFORMS: { id: SharePlatformId; label: string }[] = [
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'substack', label: 'Substack' },
  { id: 'threads', label: 'Threads' },
  { id: 'truthsocial', label: 'Truth Social' },
  { id: 'nextdoor', label: 'Nextdoor' },
]

export function useShareLinksModel({
  url,
  title,
  description,
  mdSource,
  shareExtract: shareExtractProp,
  ogImageUrl,
}: ShareLinksProps) {
  const absUrl = buildAbsoluteUrl(url)

  const shareExtract = useMemo(() => {
    if (shareExtractProp) return shareExtractProp
    if (mdSource) {
      return extractShareMetadata({ rawMarkdown: mdSource })
    }
    return {
      snippetPlain: description?.trim() || '',
      hashtagsLine: '',
      articleBodyPlain: '',
    }
  }, [shareExtractProp, mdSource, description])

  const composeInput = useMemo(
    () => ({
      title,
      canonicalUrl: absUrl,
      snippetPlain: shareExtract.snippetPlain,
      hashtagsLine: shareExtract.hashtagsLine,
      articleBodyPlain: shareExtract.articleBodyPlain,
      substackUrl: shareExtract.substackUrl,
    }),
    [title, absUrl, shareExtract]
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [copyFormatPlatform, setCopyFormatPlatform] = useState<SharePlatformId>('instagram')

  /**
   * Modal copy: full compose order (incl. Substack under canonical URL). X omits snippet to stay minimal.
   * Instagram / Truth Social / Nextdoor include snippet + article up to each platform’s modal limit.
   */
  const activeCopyText = useMemo(() => {
    const p = copyFormatPlatform
    const isXMinimal = p === 'x'
    const modalLimit = platformModalCopyLimit(p)
    if (modalLimit != null) {
      const longInput = { ...composeInput }
      const full = composeShareText(p, longInput)
      if (full.length <= modalLimit) return full
      return fitComposeShareToCharLimit(p, longInput, modalLimit)
    }
    return composeShareText(p, {
      ...composeInput,
      snippetPlain: isXMinimal ? '' : composeInput.snippetPlain,
      articleBodyPlain: '',
    })
  }, [copyFormatPlatform, composeInput])

  const charCount = useMemo(() => shareTextCharCount(activeCopyText), [activeCopyText])

  const xComposerWeight = useMemo(() => effectiveLengthX(activeCopyText), [activeCopyText])

  const platformOutbounds = useMemo(() => {
    return SHARE_PLATFORMS.map(({ id, label }) => {
      const intent = platformUsesTruncatedOutboundIntent(id)
        ? truncateShareTextForOutbound(id, composeInput)
        : activeCopyText
      const ob = buildOutboundHref(id, absUrl, title, intent)
      const outboundOpenUsesShortDraft =
        platformUsesTruncatedOutboundIntent(id) && intent !== activeCopyText
      const intentCharCount = outboundOpenUsesShortDraft
        ? shareTextCharCount(intent)
        : undefined
      return {
        platformId: id,
        platformLabel: label,
        href: ob.href,
        openLabel: ob.label,
        copyOnlyNote: ob.copyOnlyNote,
        outboundOpenUsesShortDraft,
        intentCharCount,
      }
    })
  }, [activeCopyText, composeInput, absUrl, title])

  const openModal = useCallback((_platform: SharePlatformId, _label: string) => {
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => setModalOpen(false), [])

  return {
    modalOpen,
    openModal,
    closeModal,
    activeCopyText,
    charCount,
    xComposerWeight,
    platformOutbounds,
    ogImageUrl,
    copyFormatPlatform,
    setCopyFormatPlatform,
  }
}
