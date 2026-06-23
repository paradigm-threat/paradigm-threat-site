'use client'

import React from 'react'
import Link from 'next/link'
import { changelogThumbSrc, PARADIGM_LOGO_SRC } from './changelogThumbUtils'
import styles from './ChangeLog.module.css'

function placeholderTitleFromPath (path) {
  const base = String(path || '').split('/').pop() || ''
  return base.replace(/_/g, ' ').replace(/\.md$/i, '')
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
  const thumbSrc = item.imageSrc ? changelogThumbSrc(item.imageSrc) : PARADIGM_LOGO_SRC
  const thumbClass = item.imageSrc
    ? `${styles.contentCardThumb}${fullscreen ? ` ${styles.thumbFs}` : ''}`
    : `${styles.contentCardThumbLogo}${fullscreen ? ` ${styles.thumbLogoFs}` : ''}`

  const dateLabel = item.date
    ? new Date(item.date).toLocaleString('en-US', { dateStyle: 'medium' })
    : ''

  const inner = (
  <>
    <div className={styles.contentCardMedia} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote changelog thumbnails */}
      <img
        src={thumbSrc}
        alt=""
        className={thumbClass}
        loading="lazy"
      />
    </div>
    <div className={styles.contentCardBody}>
      <h3 className={styles.contentCardTitle}>{displayTitle}</h3>
      {dateLabel ? (
        <time className={styles.contentCardDate} dateTime={item.date}>{dateLabel}</time>
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
