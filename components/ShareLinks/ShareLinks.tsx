'use client'

import React, { useMemo, useState, useCallback } from 'react'
import Script from 'next/script'
import {
  composeShareText,
  countDisplay,
  extractShareMetadata,
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
  copyText: string
): { href: string | null; label: string; copyOnlyNote?: string } {
  const encodedUrl = encodeURIComponent(absUrl)

  switch (platform) {
    case 'x':
      return {
        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(copyText)}`,
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
        href: `https://bsky.app/intent/compose?text=${encodeURIComponent(copyText)}`,
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
        href: `https://www.threads.net/intent/post?text=${encodeURIComponent(copyText)}`,
        label: 'Open Threads',
      }
    case 'truthsocial':
      return {
        href: `https://truthsocial.com/share?url=${encodedUrl}&text=${encodeURIComponent(copyText)}`,
        label: 'Open Truth Social',
        copyOnlyNote:
          'Official share URL (help.truthsocial.com/publishers/share-button): the text parameter is limited to 500 characters. The page URL is passed separately.',
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

  const activeDisplay = useMemo(() => {
    if (!modal) return { used: 0, limit: 0 }
    return countDisplay(modal.platform, activeCopyText)
  }, [modal, activeCopyText])

  const outbound = useMemo(() => {
    if (!modal) return { href: null as string | null, label: '', copyOnlyNote: undefined as string | undefined }
    return buildOutboundHref(modal.platform, absUrl, title, activeCopyText)
  }, [modal, absUrl, title, activeCopyText])

  const openModal = useCallback((platform: SharePlatformId, label: string) => {
    setModal({ platform, label })
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
      {/* Official Truth Social share.js — binds `.truthsocial-share` + `data-url` (see help.truthsocial.com/publishers/share-button/). */}
      <Script src="https://truthsocial.com/instance/share.js" strategy="lazyOnload" />
      <a
        className="truthsocial-share sr-only"
        data-url={absUrl}
        href={`https://truthsocial.com/share?url=${encodeURIComponent(absUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
      >
        Truth Social
      </a>
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
          usedChars={activeDisplay.used}
          limitChars={activeDisplay.limit}
          weightedNote={modal.platform === 'x' || modal.platform === 'threads'}
          outboundHref={outbound.href}
          outboundLabel={outbound.label}
          ogImageUrl={ogImageUrl}
          copyOnlyNote={outbound.copyOnlyNote}
        />
      ) : null}
    </div>
  )
}
