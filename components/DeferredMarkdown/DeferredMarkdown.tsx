'use client'

import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { RelayMarkdown } from '@/components/RelayMarkdown'
import { remoteRelay } from '@/lib/remoteRelayStore'

export type DeferredMarkdownProps = {
  src?: string
  /** CSS length, e.g. "20500px" — reserves space so scroll does not jump. */
  minHeight?: string | number
  [k: string]: unknown
}

const DEFAULT_SRC = 'page-sections/investigations.md'
const DEFAULT_MIN_HEIGHT = '20500px'

function resolveMinHeight (raw: string | number | undefined): string {
  if (typeof raw === 'number' && raw > 0) return `${raw}px`
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim()
  return DEFAULT_MIN_HEIGHT
}

function fragmentBasePath (src: string): string {
  const clean = src.replace(/^\//, '')
  const slash = clean.lastIndexOf('/')
  if (slash < 0) return ''
  return clean.slice(0, slash)
}

/**
 * Tip-park deferred island for Next/md2ast: fetch a fragment from the files
 * relay and render with the same files markdown overrides as page.md.
 */
export default function DeferredMarkdown ({
  src: srcProp,
  minHeight: minHeightProp,
}: DeferredMarkdownProps) {
  const src =
    typeof srcProp === 'string' && srcProp.trim().length > 0
      ? srcProp.trim().replace(/^\//, '')
      : DEFAULT_SRC
  const minHeight = resolveMinHeight(
    typeof minHeightProp === 'string' || typeof minHeightProp === 'number'
      ? minHeightProp
      : undefined,
  )

  const filesBaseUrl = useSyncExternalStore(
    (cb) => remoteRelay.subscribe(cb),
    () => remoteRelay.getSnapshot().filesBaseUrl,
    () => remoteRelay.getSnapshot().filesBaseUrl,
  )

  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filesBaseUrl) return
    let cancelled = false
    const url = `${filesBaseUrl.replace(/\/$/, '')}/${src}`
    queueMicrotask(() => {
      if (!cancelled) {
        setError(null)
      }
    })
    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((text) => {
        if (!cancelled) {
          setContent(text)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setContent(null)
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      })
    return () => {
      cancelled = true
    }
  }, [filesBaseUrl, src])

  const basePath = useMemo(() => fragmentBasePath(src), [src])

  if (error) {
    return (
      <section
        className="pt-deferred-md my-6 rounded-lg border border-red-300/60 bg-red-50/50 px-4 py-3 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200"
        aria-label="Deferred section"
        style={{ minHeight }}
      >
        Failed to load section: {error}
      </section>
    )
  }

  if (!content) {
    return (
      <section
        className="pt-deferred-md"
        aria-label="Deferred section"
        aria-busy="true"
        style={{ minHeight }}
      />
    )
  }

  return (
    <section
      className="pt-deferred-md"
      aria-label="Deferred section"
      style={{ minHeight }}
    >
      <RelayMarkdown content={content} basePath={basePath} sourcePath={src} />
    </section>
  )
}
