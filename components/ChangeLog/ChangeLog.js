'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useImageGallery } from '@/components/Image/ImageGalleryContext'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { getPrimaryFilesBaseUrl, getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'
import styles from './ChangeLog.module.css'

/** Same mark as Navbar triangle — local to Next app. */
const PARADIGM_LOGO_SRC = '/site/favicon.svg'

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i

function toHrefForRepo(pathLike, repo) {
  const clean = String(pathLike || '').replace(/^\/+/, '')
  if (!clean) return null
  if (repo === 'paradigm-threat-timeline') {
    return clean.startsWith('timeline/') ? `/${clean}` : `/timeline/${clean}`.replace(/\/+/g, '/')
  }
  return `/${clean}`
}

function inferFilesFromMessage(message, repo) {
  if (typeof message !== 'string' || !message) return []
  const pathMatch = message.match(/\b([a-z0-9._-]+\/[a-z0-9._\/-]+)\b/i)
  if (!pathMatch) return []
  const rawPath = pathMatch[1].replace(/[),.;:!?]+$/, '')
  const href = toHrefForRepo(rawPath, repo)
  if (!href) return []
  return [{ path: rawPath, href, status: 'M' }]
}

function inferImagesFromFiles(files) {
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

function normalizeEntry(entry, fallbackRepo) {
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
    images
  }
}

/** Stable React key without git hash (changelog is paths-first). */
function entryKey(entry, index) {
  return `${entry.repo}:${entry.date}:${entry.message}:${index}`
}

function getFileLabel(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) return 'file'
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || normalized
}

/** Root-relative path for same-origin / #img=; pass through external http(s) only. */
function changelogPublicImageSrc(src) {
  if (!src) return ''
  const s = String(src).trim()
  if (/^https?:\/\//i.test(s)) return s
  const noQuery = s.split('?')[0]
  const withSlash = noQuery.startsWith('/') ? noQuery : `/${noQuery}`
  return withSlash.replace(/\/+/g, '/')
}

const CHANGELOG_THUMB_IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i

/**
 * Changelog strip `<img>` must not use raw `/history/...` on the Next origin (404).
 * Uses Relay ?w= when primary mirrors are Relay, else `/api/image` + mirrors.
 */
function changelogThumbSrc(src) {
  const publicSrc = changelogPublicImageSrc(src)
  if (!publicSrc) return ''
  if (publicSrc.startsWith('/api/')) return publicSrc
  if (publicSrc.startsWith('/site/')) return publicSrc
  if (/^https?:\/\//i.test(publicSrc)) return publicSrc
  const pathOnly = publicSrc.split('?')[0]
  if (pathOnly.startsWith('/') && CHANGELOG_THUMB_IMAGE_EXT.test(pathOnly)) {
    return buildOptimizedAssetUrl(pathOnly, 160)
  }
  return publicSrc
}

/** Match #img= targets to gallery src (relative or legacy absolute bookmarks). */
function changelogSrcMatchesHash(resolvedSrc, hashDecoded) {
  if (!hashDecoded || !resolvedSrc) return false
  if (resolvedSrc === hashDecoded) return true
  const r = resolvedSrc.split('?')[0]
  const h = String(hashDecoded).split('?')[0]
  if (r === h) return true

  if (r.startsWith('/') && /^https?:\/\//i.test(h)) {
    try {
      const u = new URL(h)
      const p = u.pathname.replace(/\/+$/, '') || '/'
      const rp = r.replace(/\/+$/, '') || '/'
      return p === rp
    } catch {
      /* fall through */
    }
  }

  try {
    const u1 = new URL(resolvedSrc)
    const u2 = new URL(hashDecoded, typeof window !== 'undefined' ? window.location.origin : 'https://paradigmthreat.net')
    return u1.pathname === u2.pathname && u1.hostname === u2.hostname
  } catch {
    return false
  }
}

function buildGalleryItemsForEntry(entry) {
  const imgs = Array.isArray(entry.images) ? entry.images.filter((x) => x && x.src) : []
  if (imgs.length === 0) {
    return [{ src: PARADIGM_LOGO_SRC, alt: 'Paradigm Threat' }]
  }
  return imgs.map((im) => ({
    src: changelogPublicImageSrc(im.src),
    alt: im.alt
  }))
}

export default function ChangeLog({ target = '_self' }) {
  const [changeLog, setChangeLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const { openGallery, isOpen: galleryOpen } = useImageGallery()

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

        const [filesRes, timelineRes] = await Promise.allSettled([
          fetch(`${filesBaseUrl}/changelog.json`, { cache: 'no-store' }),
          fetch(`${timelineBaseUrl}/changelog.json`, { cache: 'no-store' })
        ])

        const filesData =
          filesRes.status === 'fulfilled' && filesRes.value.ok
            ? await filesRes.value.json()
            : []
        const timelineData =
          timelineRes.status === 'fulfilled' && timelineRes.value.ok
            ? await timelineRes.value.json()
            : []

        const merged = [
          ...(Array.isArray(filesData) ? filesData.map((x) => normalizeEntry(x, 'paradigm-threat-files')).filter(Boolean) : []),
          ...(Array.isArray(timelineData) ? timelineData.map((x) => normalizeEntry(x, 'paradigm-threat-timeline')).filter(Boolean) : [])
        ]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 16)

        setChangeLog(merged)
      } catch (e) {
        console.error('Failed to fetch changelog.json', e)
      } finally {
        setLoading(false)
      }
    }

    fetchChangeLog()
  }, [])

  useEffect(() => {
    if (changeLog.length === 0) return undefined

    function tryOpenFromHash() {
      if (typeof window === 'undefined') return
      const hash = window.location.hash
      if (!hash.startsWith('#img=')) {
        return
      }
      let target
      try {
        target = decodeURIComponent(hash.slice(5))
      } catch {
        return
      }
      if (!target) return

      for (const entry of changeLog) {
        const items = buildGalleryItemsForEntry(entry)
        const idx = items.findIndex((item) => changelogSrcMatchesHash(item.src, target))
        if (idx >= 0) {
          openGallery(items, idx)
          return
        }
      }
    }

    tryOpenFromHash()
    window.addEventListener('hashchange', tryOpenFromHash)
    return () => window.removeEventListener('hashchange', tryOpenFromHash)
  }, [changeLog, openGallery])

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
  const listClass = `${styles.changelog}${fullscreen ? ` ${styles.changelogFullscreen}` : ''}`

  return (
    <div className={`not-prose w-full min-w-0 max-w-none ${wrapClass}`}>
      <div className={styles.toolbar}>
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
      <ul className={listClass}>
        {Array.isArray(changeLog) && changeLog.map((entry, entryIdx) => {
          const imgs = Array.isArray(entry.images) ? entry.images.filter((x) => x && x.src) : []
          const galleryItems = buildGalleryItemsForEntry(entry)

          const openAt = (i) => {
            openGallery(galleryItems, i)
          }

          return (
            <li key={entryKey(entry, entryIdx)} className={styles.entry}>
              <div className={styles.imageStrip}>
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
                        <a href={file.href} target={target} title={file.path}>{getFileLabel(file.path)}</a>
                      </React.Fragment>
                    ))}
                  </div>
                )}
                {(!Array.isArray(entry.files) || entry.files.length === 0) && (
                  <div className="opacity-70 text-sm">no file links in source changelog yet</div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
