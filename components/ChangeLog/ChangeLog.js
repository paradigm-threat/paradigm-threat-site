'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useImageGallery } from '@/components/Image/ImageGalleryContext'
import { queryRecentFilesContent } from '@/lib/changelog/queryRecentContent'
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
  const [fullscreen, setFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState('articles')
  const { openGallery, isOpen: galleryOpen } = useImageGallery()

  useEffect(() => {
    setActiveTab(readStoredTab())
  }, [])

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
    const fetchChangeLog = async () => {
      try {
        const result = await queryRecentFilesContent()
        setFeedLog(result.feed)
        setContentByTab(result.contentByTab)
      } catch (e) {
        console.error('Failed to fetch recent content from QUERY', e)
      } finally {
        setLoading(false)
      }
    }

    fetchChangeLog()
  }, [])

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

  if (loading) {
    return (
      <div className="not-prose w-full min-w-0 max-w-none animate-pulse flex space-x-4 py-2" data-toc-ignore>
        <div className="flex-1 space-y-4 py-1 min-w-0">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        </div>
      </div>
    )
  }

  const wrapClass = fullscreen ? styles.wrapFullscreen : styles.wrap

  const panelItems = activeTab === 'articles'
    ? contentByTab.articles
    : activeTab === 'investigations'
      ? contentByTab.investigations
      : activeTab === 'blog'
        ? contentByTab.blog
        : []

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

      {activeTab === 'changelog' ? (
        <div
          role="tabpanel"
          id="changelog-panel-changelog"
          aria-labelledby="changelog-tab-changelog"
          className={styles.tabPanel}
        >
          <ChangeLogFeed
            changeLog={feedLog}
            target={target}
            fullscreen={fullscreen}
            openGallery={openGallery}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`changelog-panel-${activeTab}`}
          aria-labelledby={`changelog-tab-${activeTab}`}
          className={styles.tabPanel}
        >
          <ChangeLogContentList
            items={panelItems}
            tabKind={activeTab}
            target={target}
            fullscreen={fullscreen}
          />
        </div>
      )}
    </div>
  )
}
