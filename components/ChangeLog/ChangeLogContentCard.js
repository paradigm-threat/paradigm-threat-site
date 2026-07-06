'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { changelogThumbSrc } from './changelogThumbUtils'
import { formatIndexDateTiny, parseIndexUpdated } from '@/lib/indexUpdated'
import styles from './ChangeLog.module.css'

function placeholderTitleFromPath (path) {
  const base = String(path || '').split('/').pop() || ''
  return base.replace(/_/g, ' ').replace(/\.md$/i, '')
}

function formatChangelogDateLine (label, iso) {
  const formatted = formatIndexDateTiny(iso)
  if (!formatted) return null
  return `${label}: ${formatted}`
}

function sameCalendarDay (a, b) {
  const da = parseIndexUpdated(a)
  const db = parseIndexUpdated(b)
  if (!da || !db) return false
  return (
    da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate()
  )
}

export default function ChangeLogContentCard ({
  item,
  title,
  description,
  loadingMeta,
  target = '_self',
  fullscreen = false,
}) {
  const displayTitle = title || placeholderTitleFromPath(item.path)
  const [imageFailed, setImageFailed] = useState(false)

  const hasImageSrc = typeof item.imageSrc === 'string' && item.imageSrc.trim().length > 0
  const showImage = hasImageSrc && !imageFailed
  const thumbSrc = showImage ? changelogThumbSrc(item.imageSrc) : ''
  const thumbClass = `${styles.contentCardThumb}${fullscreen ? ` ${styles.thumbFs}` : ''}`

  const publishedLine = item.originalPublishedAt
    ? formatChangelogDateLine('Originally published', item.originalPublishedAt)
    : null
  const updatedLine = formatChangelogDateLine('Last updated', item.updatedAt || item.date)
  const showBothDates = publishedLine && updatedLine && !sameCalendarDay(item.originalPublishedAt, item.updatedAt || item.date)
  const singleDateLine = showBothDates
    ? null
    : (publishedLine || updatedLine)

  const inner = (
  <>
    {showImage && thumbSrc ? (
      <div className={styles.contentCardMedia} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote changelog thumbnails */}
        <img
          src={thumbSrc}
          alt=""
          className={thumbClass}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
    ) : null}
    <div className={styles.contentCardBody}>
      <h3 className={styles.contentCardTitle}>{displayTitle}</h3>
      {showBothDates ? (
        <div className={styles.contentCardDates}>
          <time className={styles.contentCardDate} dateTime={item.originalPublishedAt}>{publishedLine}</time>
          <time className={styles.contentCardDate} dateTime={item.updatedAt || item.date}>{updatedLine}</time>
        </div>
      ) : singleDateLine ? (
        <time
          className={styles.contentCardDate}
          dateTime={item.originalPublishedAt || item.updatedAt || item.date}
        >
          {singleDateLine}
        </time>
      ) : null}
      {loadingMeta && !description ? (
        <p className={styles.contentCardDescSkeleton} aria-hidden />
      ) : description ? (
        <p className={styles.contentCardDesc}>{description}</p>
      ) : null}
    </div>
  </>
  )

  const className = styles.contentCard

  if (/^https?:\/\//i.test(item.href)) {
    return (
      <a
        href={item.href}
        className={className}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      >
        {inner}
      </a>
    )
  }

  return (
    <Link
      href={item.href}
      className={className}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    >
      {inner}
    </Link>
  )
}
