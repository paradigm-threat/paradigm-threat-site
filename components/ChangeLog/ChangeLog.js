'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useImageGallery } from '@/components/Image/ImageGalleryContext'
import { buildContentItemsFromChangelog } from '@/lib/changelog/buildContentItemsFromChangelog'
import { buildBlogItemsFromIndex, mergeBlogTabItems } from '@/lib/changelog/buildBlogItemsFromIndex'
import { getPrimaryFilesBaseUrl, getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'
import ChangeLogTabs from './ChangeLogTabs'
import ChangeLogContentList from './ChangeLogContentList'
import ChangeLogFeed from './ChangeLogFeed'
import {
  changelogSrcMatchesHash,
  buildGalleryItemsForEntry,
} from './changelogThumbUtils'
import styles from './ChangeLog.module.css'

const TAB_STORAGE_KEY = 'paradigm-changelog-tab'

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i

function toHrefForRepo (pathLike, repo) {
  const clean = String(pathLike || '').replace(/^\/+/, '')
  if (!clean) return null
  if (repo === 'paradigm-threat-timeline') {
    return clean.startsWith('timeline/') ? `/${clean}` : `/timeline/${clean}`.replace(/\/+/g, '/')
  }
  return `/${clean}`
}

function inferFilesFromMessage (message, repo) {
  if (typeof message !== 'string' || !message) return []
  const pathMatch = message.match(/\b([a-z0-9._-]+\/[a-z0-9._/-]+)\b/i)
  if (!pathMatch) return []
  const rawPath = pathMatch[1].replace(/[),.;:!?]+$/, '')
  const href = toHrefForRepo(rawPath, repo)
  if (!href) return []
  return [{ path: rawPath, href, status: 'M' }]
}

function inferImagesFromFiles (files) {
  if (!Array.isArray(files)) return []
  const out = []
  const seen = new Set()
  for (const f of files) {
    const p = f.path || ''
    if (!IMAGE_EXT.test(p)) continue
    const src = p.startsWith('/') ? p : `/${p.replace(/^\//, '')}`
    if (!seen.has(src)) {
      seen.add(src)
      out.push({ src })
    }
  }
  return out
}

function normalizeEntry (entry, fallbackRepo) {
  if (!entry || typeof entry !== 'object') return null
  const repo = entry.repo || fallbackRepo
  const explicitFiles =
    Array.isArray(entry.files) ? entry.files
      : Array.isArray(entry.changedFiles) ? entry.changedFiles
        : Array.isArray(entry.paths) ? entry.paths.map((p) => ({ path: p, href: toHrefForRepo(p, repo), status: 'M' }))
          : []
  const files = explicitFiles.length > 0 ? explicitFiles : inferFilesFromMessage(entry.message || '', repo)
  let images = Array.isArray(entry.images) ? entry.images.map((x) => ({ src: x.src, alt: x.alt })) : []
  if (images.length === 0) {
    images = inferImagesFromFiles(files)
  }
  return {
    repo,
    date: entry.date || '',
    message: entry.message || '',
    files,
    images,
  }
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
  const [filesChangelog, setFilesChangelog] = useState([])
  const [blogIndexNode, setBlogIndexNode] = useState(null)
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

  const contentByTab = useMemo(() => {
    const fromChangelog = buildContentItemsFromChangelog(filesChangelog)
    const blogFromIndex = buildBlogItemsFromIndex(blogIndexNode)
    return {
      ...fromChangelog,
      blog: mergeBlogTabItems(blogFromIndex, fromChangelog.blog),
    }
  }, [filesChangelog, blogIndexNode])

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
        const filesBaseUrl = getPrimaryFilesBaseUrl()
        const timelineBaseUrl = getPrimaryTimelineBaseUrl()

        const [filesRes, timelineRes, indexRes] = await Promise.allSettled([
          fetch(`${filesBaseUrl}/changelog.json`, { cache: 'no-store' }),
          fetch(`${timelineBaseUrl}/changelog.json`, { cache: 'no-store' }),
          fetch(`${filesBaseUrl}/index.json`, { cache: 'no-store' }),
        ])

        const filesData =
          filesRes.status === 'fulfilled' && filesRes.value.ok
            ? await filesRes.value.json()
            : []
        const timelineData =
          timelineRes.status === 'fulfilled' && timelineRes.value.ok
            ? await timelineRes.value.json()
            : []
        const indexData =
          indexRes.status === 'fulfilled' && indexRes.value.ok
            ? await indexRes.value.json()
            : null

        const filesEntries = Array.isArray(filesData)
          ? filesData.map((x) => normalizeEntry(x, 'paradigm-threat-files')).filter(Boolean)
          : []
        const timelineEntries = Array.isArray(timelineData)
          ? timelineData.map((x) => normalizeEntry(x, 'paradigm-threat-timeline')).filter(Boolean)
          : []

        const feedMerged = [...filesEntries, ...timelineEntries]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 16)

        setFeedLog(feedMerged)
        setFilesChangelog(filesEntries)
        setBlogIndexNode(indexData?.blog ?? null)
      } catch (e) {
        console.error('Failed to fetch changelog.json', e)
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
      <div className="not-prose w-full min-w-0 max-w-none animate-pulse flex space-x-4 py-2">
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
    <div className={`not-prose w-full min-w-0 max-w-none ${wrapClass}`}>
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
