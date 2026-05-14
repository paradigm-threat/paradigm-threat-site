'use client'

import React, { useEffect, useState } from 'react'
import { RelayTimelineMarkdown } from '@/components/RelayTimelineMarkdown'
import { transformImageCaptions } from '@/components/Timeline/markdownTransform'

/** Strip H1 title and YAML frontmatter before rendering. */
function prepareMarkdownContent (md: string): string {
  if (typeof md !== 'string') return ''
  let out = md
    .replace(/^# .+\n*/m, '')
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
  return out.trimStart()
}

interface RemoteMarkdownProps {
  src: string
  baseUrl: string
  title?: string
  className?: string
}

export function RemoteMarkdown ({ src, baseUrl, title, className = '' }: RemoteMarkdownProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })
    const url = src.startsWith('http') ? src : `${baseUrl.replace(/\/$/, '')}/${src.replace(/^\//, '')}`
    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load')
        setContent(null)
        setLoading(false)
      })
  }, [src, baseUrl])

  if (loading) {
    return <div className={`animate-pulse text-slate-500 text-sm ${className}`}>Loading…</div>
  }
  if (error) {
    return <div className={`text-red-600 dark:text-red-400 text-sm ${className}`}>Failed to load: {error}</div>
  }
  if (!content) return null

  const prepared = prepareMarkdownContent(content)
  const transformed = transformImageCaptions(prepared)

  return (
    <article className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{title}</h2>}
      <RelayTimelineMarkdown content={transformed} basePath={baseUrl} />
    </article>
  )
}
