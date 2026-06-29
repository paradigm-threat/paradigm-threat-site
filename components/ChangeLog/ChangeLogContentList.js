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
        title: placeholderTitleFromPath(item.path),
        description: '',
      }
    })
    setMetaByPath(initial)

    const fetchAll = async () => {
      const baseUrl = getPrimaryFilesBaseUrl()
      const results = { ...initial }

      await Promise.all(
        visibleItems.map(async (item) => {
          try {
            const res = await fetch(`${baseUrl}/${item.path}`, { cache: 'no-store' })
            if (!res.ok) return
            const text = await res.text()
            const title = await extractTitleFromMarkdown(text)
            const { snippetPlain } = extractShareMetadata({ rawMarkdown: text })
            results[item.path] = {
              title: title || placeholderTitleFromPath(item.path),
              description: snippetPlain || '',
            }
          } catch {
            /* ignore */
          }
        }),
      )

      if (!cancelled) {
        setMetaByPath(results)
        setLoadingMeta(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsKey captures list identity
  }, [itemsKey])

  if (!visibleItems.length) {
    return (
      <p className={styles.contentEmpty}>{EMPTY_COPY[tabKind] || 'No items yet.'}</p>
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
