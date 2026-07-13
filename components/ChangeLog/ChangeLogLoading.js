'use client'

import React from 'react'
import styles from './ChangeLog.module.css'

const SKELETON_COUNT = 4

export default function ChangeLogLoading ({ statusMessage, fullscreen = false }) {
  const listClass = `${styles.contentList}${fullscreen ? ` ${styles.contentListFullscreen}` : ''}`

  return (
    <div className={styles.loadingPanel} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.loadingStatus}>
        <span className={styles.loadingSpinner} aria-hidden />
        <span className={styles.loadingMessage}>{statusMessage}</span>
      </div>

      <ul className={listClass} aria-hidden>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <li key={i} className={styles.contentListItem}>
            <div className={styles.contentCardSkeleton}>
              <div className={styles.skeletonThumb} />
              <div className={styles.skeletonBody}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLineTitle}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineDate}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineDesc}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineDescShort}`} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
