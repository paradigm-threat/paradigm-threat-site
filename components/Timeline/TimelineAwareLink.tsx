'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MarkdownLink } from '@/components/MarkdownLink'
import { useTimelineLink } from '@/components/Timeline/TimelineLinkContext'

function TimelineAwareLinkInner ({
  href,
  children,
  ...props
}: {
  href?: string
  children?: React.ReactNode
  [key: string]: unknown
}) {
  const searchParams = useSearchParams()
  const { onTimelineNavigate } = useTimelineLink()

  const isTimelineInternal =
    typeof href === 'string' && href.startsWith('/timeline') && !href.startsWith('http')
  const pathOnly = typeof href === 'string' ? href.split('?')[0] : ''
  const eventId =
    isTimelineInternal && pathOnly
      ? decodeURIComponent(pathOnly.replace(/^\/timeline\/?/, '').trim())
      : ''
  const preservedHref =
    isTimelineInternal && href
      ? `${pathOnly}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      : href

  if (eventId && onTimelineNavigate && typeof preservedHref === 'string') {
    return (
      <Link
        href={preservedHref}
        onClick={(e) => {
          e.preventDefault()
          onTimelineNavigate(eventId)
        }}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </Link>
    )
  }

  return (
    <MarkdownLink href={preservedHref} {...props}>
      {children}
    </MarkdownLink>
  )
}

/**
 * For timeline event links: uses in-app callback so selection and URL update without
 * full page refresh, preserving fullscreen and view mode. Otherwise same as MarkdownLink
 * and preserves current search params for /timeline/* so navigation keeps fullscreen.
 */
export function TimelineAwareLink (props: {
  href?: string
  children?: React.ReactNode
  [key: string]: unknown
}) {
  return (
    <Suspense fallback={<MarkdownLink href={props.href} {...props} />}>
      <TimelineAwareLinkInner {...props} />
    </Suspense>
  )
}
