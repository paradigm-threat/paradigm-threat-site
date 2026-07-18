'use client'

import React, { useEffect, useState } from 'react'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'
import { extractShareMetadata } from '@/lib/share/extractShareMetadata'
import ChangeLogContentCard from './ChangeLogContentCard'
import styles from './ChangeLog.module.css'

const FETCH_CAP_BY_TAB = {
  articles: 24,
  investigations: 24,
  blog: 48,
}

/** Persist snippet meta across tab remounts / revisits. */
const metaCache = new Map()

const EMPTY_COPY = {
  articles: 'No articles updated in the last 30 days.',
  investigations: 'No investigations updated in the last 30 days.',
  blog: 'No blog posts updated in the last 30 days.',
}

function placeholderTitleFromPath (path) {
  const base = String(path || '').split('/').pop() || ''
  return base.replace(/_/g, ' ').replace(/\.md$/i, '')
}

function titleForItem (item) {
  if (typeof item?.title === 'string' && item.title.trim()) return item.title.trim()
  return placeholderTitleFromPath(item?.path)
}

function seedMeta (items) {
  const next = {}
  items.forEach((item) => {
    const cached = metaCache.get(item.path)
    next[item.path] = {
      title: titleForItem(item),
      description: cached?.description || '',
    }
  })
  return next
}

async function extractTitleFromMarkdown (text) {
  const matter = (await import('gray-matter')).default
  const { data, content } = matter(text)
  if (typeof data?.title === 'string' && data.title.trim()) return data.title.trim()
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * Idle-fetch descriptions only (titles come from QUERY).
 * Batched setState + module cache — avoids 24× re-renders per tab switch.
 */
async function fetchMissingDescriptions (items, signal, onBatch) {
  const baseUrl = getPrimaryFilesBaseUrl()
  const pending = items.filter((item) => {
    const cached = metaCache.get(item.path)
    return !(cached && typeof cached.description === 'string' && cached.description.length > 0)
  })
  if (pending.length === 0) return

  const CONCURRENCY = 4
  let cursor = 0
  const batch = {}

  const flush = () => {
    const keys = Object.keys(batch)
    if (keys.length === 0) return
    const snapshot = { ...batch }
    keys.forEach((k) => { delete batch[k] })
    onBatch(snapshot)
  }

  async function worker () {
    while (cursor < pending.length) {
      if (signal.aborted) return
      const idx = cursor
      cursor += 1
      const item = pending[idx]
      try {
        const res = await fetch(`${baseUrl}/${item.path}`, { cache: 'force-cache', signal })
        if (!res.ok || signal.aborted) continue
        const text = await res.text()
        if (signal.aborted) return
        const title = await extractTitleFromMarkdown(text)
        const { snippetPlain } = extractShareMetadata({ rawMarkdown: text })
        const meta = {
          title: title || titleForItem(item),
          description: snippetPlain || '',
        }
        metaCache.set(item.path, meta)
        batch[item.path] = meta
        if (Object.keys(batch).length >= 4) flush()
      } catch {
        /* abort or network — ignore */
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => worker()))
  if (!signal.aborted) flush()
}

export default function ChangeLogContentList ({
  items,
  tabKind,
  target = '_self',
  fullscreen = false,
  catalogMeta = null,
  active = true,
}) {
  const fetchCap = FETCH_CAP_BY_TAB[tabKind] ?? 24
  const visibleItems = Array.isArray(items) ? items.slice(0, fetchCap) : []
  const itemsKey = visibleItems.map((x) => x.path).join('|')

  const [metaByPath, setMetaByPath] = useState(() => seedMeta(visibleItems))

  useEffect(() => {
    setMetaByPath(seedMeta(visibleItems))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsKey captures list identity
  }, [itemsKey])

  useEffect(() => {
    if (!active || visibleItems.length === 0) return undefined

    const controller = new AbortController()
    let idleId = 0
    let timeoutId = 0

    const run = () => {
      fetchMissingDescriptions(visibleItems, controller.signal, (batch) => {
        setMetaByPath((prev) => ({ ...prev, ...batch }))
      })
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: 1200 })
    } else {
      timeoutId = window.setTimeout(run, 0)
    }

    return () => {
      controller.abort()
      if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId) window.clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsKey + active gate fetch
  }, [itemsKey, active])

  if (!visibleItems.length) {
    const originNote = catalogMeta?.origin
      ? ` Index: ${catalogMeta.catalogRowCount ?? 0} docs from ${catalogMeta.origin}.`
      : ''
    return (
      <p className={styles.contentEmpty}>
        {(EMPTY_COPY[tabKind] || 'No items yet.') + originNote}
      </p>
    )
  }

  return (
    <ul className={styles.contentList}>
      {visibleItems.map((item) => {
        const meta = metaByPath[item.path]
        return (
          <li key={item.path} className={styles.contentListItem}>
            <ChangeLogContentCard
              key={`${item.path}:${item.imageSrc ?? ''}`}
              item={item}
              title={meta?.title || titleForItem(item)}
              description={meta?.description || ''}
              loadingMeta={false}
              target={target}
              fullscreen={fullscreen}
            />
          </li>
        )
      })}
    </ul>
  )
}
