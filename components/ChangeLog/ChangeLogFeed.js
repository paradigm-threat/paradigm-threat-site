'use client'

import React from 'react'
import Link from 'next/link'
import { Maximize2 } from 'lucide-react'
import {
  changelogThumbSrc,
  buildGalleryItemsForEntry,
  PARADIGM_LOGO_SRC,
} from './changelogThumbUtils'
import styles from './ChangeLog.module.css'

function entryKey (entry, index) {
  return `${entry.repo}:${entry.date}:${entry.message}:${index}`
}

function getFileLabel (filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) return 'file'
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || normalized
}

export default function ChangeLogFeed ({
  changeLog,
  target = '_self',
  fullscreen = false,
  openGallery,
}) {
  const listClass = `${styles.changelog}${fullscreen ? ` ${styles.changelogFullscreen}` : ''}`

  return (
    <ul className={listClass}>
      {Array.isArray(changeLog) && changeLog.map((entry, entryIdx) => {
        const imgs = Array.isArray(entry.images) ? entry.images.filter((x) => x && x.src) : []
        const galleryItems = buildGalleryItemsForEntry(entry)

        const openAt = (i) => {
          openGallery(galleryItems, i)
        }

        return (
          <li key={entryKey(entry, entryIdx)} className={styles.entry}>
            <div
              className={styles.imageStripScroll}
              role="region"
              aria-label="Images for this change"
            >
              {imgs.length > 0 ? (
                imgs.map((im, i) => (
                  <button
                    key={`${entryKey(entry, entryIdx)}:img:${im.src}:${i}`}
                    type="button"
                    className={styles.thumbBtn}
                    onClick={() => openAt(i)}
                    aria-label={im.alt ? `Open image: ${im.alt}` : 'Open image in viewer'}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote changelog thumbnails */}
                    <img
                      src={changelogThumbSrc(im.src)}
                      alt={im.alt || ''}
                      className={`${styles.thumb}${fullscreen ? ` ${styles.thumbFs}` : ''}`}
                      loading="lazy"
                    />
                    <span className={styles.thumbMaximize} aria-hidden>
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  className={styles.thumbBtn}
                  onClick={() => openAt(0)}
                  aria-label="Open Paradigm Threat logo in viewer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static site logo */}
                  <img
                    src={PARADIGM_LOGO_SRC}
                    alt="Paradigm Threat"
                    className={`${styles.thumbLogo}${fullscreen ? ` ${styles.thumbLogoFs}` : ''}`}
                  />
                  <span className={styles.thumbMaximize} aria-hidden>
                    <Maximize2 className="w-4 h-4" />
                  </span>
                </button>
              )}
            </div>
            <div className={styles.entryBody}>
              <div>
                {new Date(entry.date).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })} - {entry.message} ({entry.repo})
              </div>
              {Array.isArray(entry.files) && entry.files.length > 0 && (
                <div>
                  {entry.files.map((file, idx) => (
                    <React.Fragment key={`${entryKey(entry, entryIdx)}:${file.path}:${idx}`}>
                      {idx > 0 ? ' | ' : ''}
                      {/^https?:\/\//i.test(file.href) ? (
                        <a href={file.href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} title={file.path}>{getFileLabel(file.path)}</a>
                      ) : (
                        <Link href={file.href} title={file.path} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>{getFileLabel(file.path)}</Link>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
              {(!Array.isArray(entry.files) || entry.files.length === 0) && (
                <div className="opacity-70 text-sm">no file links in recent-content index yet</div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
