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

function placeholderTitleFromPath (path) {
  const base = String(path || '').split('/').pop() || ''
  return base.replace(/_/g, ' ').replace(/\.md$/i, '')
}

async function extractTitleFromMarkdown (text) {
  const matter = (await import('gray-matter')).default
  const { data, content } = matter(text)
  if (typeof data?.title === 'string' && data.title.trim()) return data.title.trim()
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

const EMPTY_COPY = {
  articles: 'No articles updated in the last 30 days.',
  investigations: 'No investigations updated in the last 30 days.',
  blog: 'No blog posts updated in the last 30 days.',
}

export default function ChangeLogContentList ({
  items,
  tabKind,
  target = '_self',
  fullscreen = false,
  catalogMeta = null,
}) {
  const [metaByPath, setMetaByPath] = useState({})
  const [loadingMeta, setLoadingMeta] = useState(false)

  const fetchCap = FETCH_CAP_BY_TAB[tabKind] ?? 24
  const visibleItems = Array.isArray(items) ? items.slice(0, fetchCap) : []
  const itemsKey = visibleItems.map((x) => x.path).join('|')

  useEffect(() => {
    if (visibleItems.length === 0) return undefined

    let cancelled = false
    setLoadingMeta(true)

    const initial = {}
    visibleItems.forEach((item) => {
      initial[item.path] = {
        title: (typeof item.title === 'string' && item.title.trim())
          ? item.title.trim()
          : placeholderTitleFromPath(item.path),
        description: '',
      }
    })
    setMetaByPath(initial)

    const baseUrl = getPrimaryFilesBaseUrl()
    let remaining = visibleItems.length

    visibleItems.forEach((item) => {
      ;(async () => {
        try {
          const res = await fetch(`${baseUrl}/${item.path}`, { cache: 'force-cache' })
          if (!res.ok || cancelled) return
          const text = await res.text()
          if (cancelled) return
          const title = await extractTitleFromMarkdown(text)
          const { snippetPlain } = extractShareMetadata({ rawMarkdown: text })
          if (cancelled) return
          setMetaByPath((prev) => ({
            ...prev,
            [item.path]: {
              title: title
                || (typeof item.title === 'string' && item.title.trim())
                || placeholderTitleFromPath(item.path),
              description: snippetPlain || '',
            },
          }))
        } catch {
          /* ignore */
        } finally {
          remaining -= 1
          if (!cancelled && remaining <= 0) setLoadingMeta(false)
        }
      })()
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsKey captures list identity
  }, [itemsKey])

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
              title={meta?.title}
              description={meta?.description}
              loadingMeta={loadingMeta && !meta?.description}
              target={target}
              fullscreen={fullscreen}
            />
          </li>
        )
      })}
    </ul>
  )
}
