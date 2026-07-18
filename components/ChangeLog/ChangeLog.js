'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useImageGallery } from '@/components/Image/ImageGalleryContext'
import {
  queryRecentFilesContent,
  RECENT_CONTENT_LOAD_MESSAGES,
} from '@/lib/changelog/queryRecentContent'
import ChangeLogLoading from './ChangeLogLoading'
import ChangeLogTabs from './ChangeLogTabs'
import ChangeLogContentList from './ChangeLogContentList'
import ChangeLogFeed from './ChangeLogFeed'
import {
  changelogSrcMatchesHash,
  buildGalleryItemsForEntry,
} from './changelogThumbUtils'
import styles from './ChangeLog.module.css'

const TAB_STORAGE_KEY = 'paradigm-changelog-tab'

function emptyContentByTab () {
  return { articles: [], investigations: [], blog: [] }
}

function readStoredTab () {
  if (typeof window === 'undefined') return 'articles'
  try {
    const stored = window.sessionStorage.getItem(TAB_STORAGE_KEY)
    if (stored === 'articles' || stored === 'investigations' || stored === 'blog' || stored === 'changelog') {
      return stored
    }
  } catch {
    /* ignore */
  }
  return 'articles'
}

export default function ChangeLog ({ target = '_self' }) {
  const [feedLog, setFeedLog] = useState([])
  const [contentByTab, setContentByTab] = useState(emptyContentByTab)
  const [loading, setLoading] = useState(true)
  const [loadStep, setLoadStep] = useState('connecting')
  const [loadErrorMessage, setLoadErrorMessage] = useState(null)
  const [catalogMeta, setCatalogMeta] = useState(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState(readStoredTab)
  const { openGallery, isOpen: galleryOpen } = useImageGallery()

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
    try {
      window.sessionStorage.setItem(TAB_STORAGE_KEY, tabId)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    setFullscreen((v) => !v)
  }, [])

  const retryLoad = useCallback(() => {
    setRetryNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!fullscreen) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (galleryOpen) return
      setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [fullscreen, galleryOpen])

  useEffect(() => {
    const controller = new AbortController()

    const fetchChangeLog = async () => {
      setLoading(true)
      setLoadErrorMessage(null)
      setLoadStep('connecting')

      const result = await queryRecentFilesContent(undefined, {
        signal: controller.signal,
        onProgress: (step) => {
          if (!controller.signal.aborted) {
            setLoadStep(step)
          }
        },
      })

      if (controller.signal.aborted) return

      setFeedLog(result.feed)
      setContentByTab(result.contentByTab)
      setCatalogMeta(
        typeof result.catalogRowCount === 'number' || result.origin
          ? { catalogRowCount: result.catalogRowCount ?? 0, origin: result.origin || '' }
          : null,
      )
      if (result.error) {
        setLoadErrorMessage(result.error.message)
        setLoadStep('error')
      } else {
        setLoadErrorMessage(null)
      }
      setLoading(false)
    }

    fetchChangeLog().catch((e) => {
      if (controller.signal.aborted) return
      console.error('Failed to fetch recent content from QUERY', e)
      const msg = e instanceof Error ? e.message : String(e)
      setLoadErrorMessage(msg || RECENT_CONTENT_LOAD_MESSAGES.error)
      setLoadStep('error')
      setLoading(false)
    })

    return () => controller.abort()
  }, [retryNonce])

  useEffect(() => {
    if (feedLog.length === 0) return undefined

    function tryOpenFromHash () {
      if (typeof window === 'undefined') return
      const hash = window.location.hash
      if (!hash.startsWith('#img=')) {
        return
      }
      let hashTarget
      try {
        hashTarget = decodeURIComponent(hash.slice(5))
      } catch {
        return
      }
      if (!hashTarget) return

      for (const entry of feedLog) {
        const items = buildGalleryItemsForEntry(entry)
        const idx = items.findIndex((item) => changelogSrcMatchesHash(item.src, hashTarget))
        if (idx >= 0) {
          openGallery(items, idx)
          return
        }
      }
    }

    tryOpenFromHash()
    window.addEventListener('hashchange', tryOpenFromHash)
    return () => window.removeEventListener('hashchange', tryOpenFromHash)
  }, [feedLog, openGallery])

  const wrapClass = fullscreen ? styles.wrapFullscreen : styles.wrap
  const statusMessage = loadErrorMessage
    || RECENT_CONTENT_LOAD_MESSAGES[loadStep]
    || RECENT_CONTENT_LOAD_MESSAGES.connecting

  const panelClass = (tabId) => (
    `${styles.tabPanel}${activeTab === tabId ? '' : ` ${styles.tabPanelHidden}`}`
  )

  return (
    <div className={`not-prose w-full min-w-0 max-w-none ${wrapClass}`} data-toc-ignore>
      <div className={styles.toolbar}>
        <ChangeLogTabs activeTab={activeTab} onTabChange={handleTabChange} />
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={toggleFullscreen}
          aria-pressed={fullscreen}
          aria-label={fullscreen ? 'Exit full screen' : 'Open change log full screen'}
          title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" aria-hidden /> : <Maximize2 className="w-4 h-4" aria-hidden />}
        </button>
      </div>

      {loading ? (
        <div
          role="tabpanel"
          id={`changelog-panel-${activeTab}`}
          aria-labelledby={`changelog-tab-${activeTab}`}
          className={styles.tabPanel}
        >
          <ChangeLogLoading statusMessage={statusMessage} fullscreen={fullscreen} />
        </div>
      ) : loadErrorMessage ? (
        <div
          role="tabpanel"
          id={`changelog-panel-${activeTab}`}
          aria-labelledby={`changelog-tab-${activeTab}`}
          className={styles.tabPanel}
        >
          <div className={styles.errorPanel} role="alert">
            <p className={styles.error}>{loadErrorMessage}</p>
            <button type="button" className={styles.retryBtn} onClick={retryLoad}>
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            role="tabpanel"
            id="changelog-panel-articles"
            aria-labelledby="changelog-tab-articles"
            hidden={activeTab !== 'articles'}
            className={panelClass('articles')}
          >
            <ChangeLogContentList
              items={contentByTab.articles}
              tabKind="articles"
              target={target}
              fullscreen={fullscreen}
              catalogMeta={catalogMeta}
              active={activeTab === 'articles'}
            />
          </div>
          <div
            role="tabpanel"
            id="changelog-panel-investigations"
            aria-labelledby="changelog-tab-investigations"
            hidden={activeTab !== 'investigations'}
            className={panelClass('investigations')}
          >
            <ChangeLogContentList
              items={contentByTab.investigations}
              tabKind="investigations"
              target={target}
              fullscreen={fullscreen}
              catalogMeta={catalogMeta}
              active={activeTab === 'investigations'}
            />
          </div>
          <div
            role="tabpanel"
            id="changelog-panel-blog"
            aria-labelledby="changelog-tab-blog"
            hidden={activeTab !== 'blog'}
            className={panelClass('blog')}
          >
            <ChangeLogContentList
              items={contentByTab.blog}
              tabKind="blog"
              target={target}
              fullscreen={fullscreen}
              catalogMeta={catalogMeta}
              active={activeTab === 'blog'}
            />
          </div>
          <div
            role="tabpanel"
            id="changelog-panel-changelog"
            aria-labelledby="changelog-tab-changelog"
            hidden={activeTab !== 'changelog'}
            className={panelClass('changelog')}
          >
            <ChangeLogFeed
              changeLog={feedLog}
              target={target}
              fullscreen={fullscreen}
              openGallery={openGallery}
            />
          </div>
        </>
      )}
    </div>
  )
}
