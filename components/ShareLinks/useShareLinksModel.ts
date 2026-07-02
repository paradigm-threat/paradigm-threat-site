'use client'

import { useMemo, useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import {
  composeInputForOutboundShare,
  composeShareText,
  effectiveLengthX,
  extractShareMetadata,
  fitComposeShareToCharLimit,
  platformUsesTruncatedOutboundIntent,
  resolveOutboundShareUrl,
  shareTextCharCount,
  truncateShareTextForOutbound,
  type SharePlatformId,
} from '@/lib/share'
import { REDDIT_TITLE_MAX, platformModalCopyLimit } from '@/lib/share/platformLimits'
import type { ShareLinksProps } from '@/components/ShareLinks/types'
import { extractFirstHeading, prepareArticleMarkdown } from '@/lib/articleBody'
import {
  draftShareTextWithBrowserAi,
  type ShareRewriteTone,
  type ShareRewriteProgress,
} from '@/lib/share/draftShareTextWithBrowserAi'
import { useReplyDraftingAvailable } from '@/lib/replyAssistant/useReplyDraftingAvailable'
import { remoteRelay } from '@/lib/remoteRelayStore'
import {
  buildRelayMdDownloadUrl,
  relayMdDownloadFilename,
  resolveArticleMdRelPathForDownload,
  shouldOfferRelayMdDownload,
} from '@/lib/share/buildRelayMdDownloadUrl'

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
        copyOnlyNote:
          'Facebook’s web share link only passes the URL. Copy the text here, then paste into a new post (up to ~8,000 characters).',
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
  mdRelayPath,
}: ShareLinksProps) {
  const absUrl = buildAbsoluteUrl(url)

  const relaySnap = useSyncExternalStore(
    (cb) => remoteRelay.subscribe(cb),
    () => remoteRelay.getSnapshot(),
    () => remoteRelay.getSnapshot(),
  )

  const relayMdDownload = useMemo(() => {
    if (!shouldOfferRelayMdDownload(url, mdRelayPath, mdSource)) return null
    const relPath = resolveArticleMdRelPathForDownload(url, mdRelayPath)
    if (!relPath || !relaySnap.filesBaseUrl) return null
    return {
      url: buildRelayMdDownloadUrl(relaySnap.filesBaseUrl, relPath),
      filename: relayMdDownloadFilename(relPath),
      relPath,
      serverLabel: relaySnap.serverLabel,
    }
  }, [url, mdRelayPath, mdSource, relaySnap.filesBaseUrl, relaySnap.serverLabel])

  const shareExtract = useMemo(() => {
    if (shareExtractProp) return shareExtractProp
    if (mdSource) {
      return extractShareMetadata({ rawMarkdown: mdSource })
    }
    return {
      snippetPlain: description?.trim() || '',
      hashtagsLine: '',
      articleBodyPlain: '',
      articleBodyParagraphsPlain: '',
    }
  }, [shareExtractProp, mdSource, description])

  const shareTitle = useMemo(() => {
    const trimmed = title.trim()
    if (mdSource) {
      const fromHeading = extractFirstHeading(prepareArticleMarkdown(mdSource))
      if (fromHeading) return fromHeading
    }
    return trimmed
  }, [title, mdSource])

  const composeInput = useMemo(
    () => ({
      title: shareTitle,
      canonicalUrl: absUrl,
      snippetPlain: shareExtract.snippetPlain,
      hashtagsLine: shareExtract.hashtagsLine,
      articleBodyPlain: shareExtract.articleBodyPlain,
      articleBodyParagraphsPlain: shareExtract.articleBodyParagraphsPlain,
      substackUrl: shareExtract.substackUrl,
    }),
    [shareTitle, absUrl, shareExtract]
  )

  const substackUrl = (shareExtract.substackUrl || '').trim()
  const hasSubstackUrl = substackUrl.length > 0

  const [modalOpen, setModalOpen] = useState(false)
  const [copyFormatPlatform, setCopyFormatPlatform] = useState<SharePlatformId>('instagram')
  const [useSubstackUrlForShare, setUseSubstackUrlForShare] = useState(true)
  const [aiCopyText, setAiCopyText] = useState<string | null>(null)
  const [shareTone, setShareTone] = useState<ShareRewriteTone>('conversational')
  const [shareRewriting, setShareRewriting] = useState(false)
  const [shareRewriteError, setShareRewriteError] = useState<string | null>(null)
  const [shareRewriteProgress, setShareRewriteProgress] = useState<ShareRewriteProgress | null>(null)
  const shareRewriteAbortRef = useRef<AbortController | null>(null)

  const aiAvailable = useReplyDraftingAvailable() === 'available'
  const canRewriteWithAi = aiAvailable && Boolean(mdSource?.trim())

  useEffect(() => {
    setAiCopyText(null)
    setShareRewriteError(null)
  }, [copyFormatPlatform])

  const articlePlainForAi = useMemo(() => {
    const useParagraphBody = copyFormatPlatform === 'facebook'
    return useParagraphBody
      ? composeInput.articleBodyParagraphsPlain || composeInput.articleBodyPlain
      : composeInput.articleBodyPlain
  }, [copyFormatPlatform, composeInput])

  /**
   * Modal copy: full compose order (incl. Substack under canonical URL). X omits snippet to stay minimal.
   * Instagram / Truth Social / Nextdoor / Facebook include snippet + article up to each platform’s modal limit.
   */
  const activeCopyText = useMemo(() => {
    const p = copyFormatPlatform
    const isXMinimal = p === 'x'
    const modalLimit = platformModalCopyLimit(p)
    if (modalLimit != null) {
      const useParagraphBody = p === 'facebook'
      const longInput = {
        ...composeInput,
        articleBodyPlain: useParagraphBody
          ? composeInput.articleBodyParagraphsPlain || composeInput.articleBodyPlain
          : composeInput.articleBodyPlain,
      }
      const full = composeShareText(p, longInput)
      if (full.length <= modalLimit) return full
      return fitComposeShareToCharLimit(p, longInput, modalLimit, {
        readFullArticleWhenClipped: useParagraphBody,
        preserveParagraphs: useParagraphBody,
      })
    }
    return composeShareText(p, {
      ...composeInput,
      snippetPlain: isXMinimal ? '' : composeInput.snippetPlain,
      articleBodyPlain: '',
    })
  }, [copyFormatPlatform, composeInput])

  const displayCopyText = aiCopyText ?? activeCopyText

  const charCount = useMemo(() => shareTextCharCount(displayCopyText), [displayCopyText])

  const xComposerWeight = useMemo(() => effectiveLengthX(displayCopyText), [displayCopyText])

  const outboundShareUrl = useMemo(
    () =>
      resolveOutboundShareUrl(absUrl, substackUrl, hasSubstackUrl && useSubstackUrlForShare),
    [absUrl, substackUrl, hasSubstackUrl, useSubstackUrlForShare]
  )

  const outboundComposeInput = useMemo(
    () =>
      composeInputForOutboundShare(
        composeInput,
        hasSubstackUrl && useSubstackUrlForShare
      ),
    [composeInput, hasSubstackUrl, useSubstackUrlForShare]
  )

  const platformOutbounds = useMemo(() => {
    return SHARE_PLATFORMS.map(({ id, label }) => {
      const intent = platformUsesTruncatedOutboundIntent(id)
        ? truncateShareTextForOutbound(id, outboundComposeInput)
        : displayCopyText
      const ob = buildOutboundHref(id, outboundShareUrl, shareTitle, intent)
      const outboundOpenUsesShortDraft =
        platformUsesTruncatedOutboundIntent(id) && intent !== displayCopyText
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
  }, [displayCopyText, outboundComposeInput, outboundShareUrl, shareTitle])

  const openModal = useCallback((_platform: SharePlatformId, _label: string) => {
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    shareRewriteAbortRef.current?.abort()
    shareRewriteAbortRef.current = null
    setShareRewriting(false)
    setModalOpen(false)
  }, [])

  const resetShareCopy = useCallback(() => {
    shareRewriteAbortRef.current?.abort()
    shareRewriteAbortRef.current = null
    setShareRewriting(false)
    setShareRewriteProgress(null)
    setAiCopyText(null)
    setShareRewriteError(null)
  }, [])

  const rewriteShareCopy = useCallback(async () => {
    if (!canRewriteWithAi || !mdSource?.trim()) return
    shareRewriteAbortRef.current?.abort()
    const controller = new AbortController()
    shareRewriteAbortRef.current = controller

    setShareRewriting(true)
    setShareRewriteError(null)
    setShareRewriteProgress({ message: 'Starting rewrite…', percent: null })

    try {
      const result = await draftShareTextWithBrowserAi({
        platform: copyFormatPlatform,
        title: shareTitle,
        canonicalUrl: absUrl,
        substackUrl: composeInput.substackUrl,
        hashtagsLine: composeInput.hashtagsLine,
        articlePlain: articlePlainForAi,
        templateCopy: activeCopyText,
        tone: shareTone,
        signal: controller.signal,
        onProgress: setShareRewriteProgress,
      })
      setAiCopyText(result.text)
    } catch (e) {
      if (controller.signal.aborted) return
      setShareRewriteError(e instanceof Error ? e.message : 'Rewrite failed')
    } finally {
      setShareRewriting(false)
      setShareRewriteProgress(null)
      shareRewriteAbortRef.current = null
    }
  }, [
    canRewriteWithAi,
    mdSource,
    copyFormatPlatform,
    shareTitle,
    absUrl,
    composeInput.substackUrl,
    composeInput.hashtagsLine,
    articlePlainForAi,
    activeCopyText,
    shareTone,
  ])

  const cancelShareRewrite = useCallback(() => {
    shareRewriteAbortRef.current?.abort()
    shareRewriteAbortRef.current = null
    setShareRewriting(false)
    setShareRewriteProgress(null)
  }, [])

  return {
    modalOpen,
    openModal,
    closeModal,
    activeCopyText: displayCopyText,
    templateCopyText: activeCopyText,
    charCount,
    xComposerWeight,
    platformOutbounds,
    ogImageUrl,
    copyFormatPlatform,
    setCopyFormatPlatform,
    hasSubstackUrl,
    useSubstackUrlForShare,
    setUseSubstackUrlForShare,
    outboundShareUrl,
    canRewriteWithAi,
    shareTone,
    setShareTone,
    shareRewriting,
    shareRewriteError,
    shareRewriteProgress,
    rewriteShareCopy,
    resetShareCopy,
    cancelShareRewrite,
    usingAiCopy: aiCopyText != null,
    relayMdDownload,
  }
}
