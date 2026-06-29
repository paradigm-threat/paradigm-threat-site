'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { PtLink } from '@/components/PtLink'
import matter from 'gray-matter'
import { Eye, EyeOff, FileText, Loader2 } from 'lucide-react'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { RelayMarkdown } from '@/components/RelayMarkdown'
import { searchEntryHref, searchEntryTitle } from '@/lib/searchEntryDisplay'
import { isBlogSearchPath } from '@/lib/searchIndexFilter'
import { getRemoteFile } from '@/server/remoteFiles'

type PreviewCacheEntry = {
  mdxSource: string
  basePath: string
  loading?: boolean
  error?: string
}

interface ArticleStackProps {
  entries: IndexedPathEntry[]
}

function pathTitle (entry: IndexedPathEntry): string {
  return searchEntryTitle(entry)
}

function readerContentSectionTitle (entries: IndexedPathEntry[]): string {
  const hasBlog = entries.some((e) => isBlogSearchPath(e.path))
  return hasBlog ? 'Articles, Investigations & Blog' : 'Articles & Investigations'
}

export function ArticleStack ({ entries }: ArticleStackProps) {
  const [openPaths, setOpenPaths] = useState<Set<string>>(() => new Set())
  const [cache, setCache] = useState<Map<string, PreviewCacheEntry>>(() => new Map())

  const ensurePreviewLoaded = useCallback(async (path: string) => {
    let shouldFetch = false
    setCache((prev) => {
      const existing = prev.get(path)
      if (existing?.loading || (existing?.mdxSource && !existing.error)) {
        return prev
      }
      shouldFetch = true
      const next = new Map(prev)
      next.set(path, { mdxSource: '', basePath: '', loading: true })
      return next
    })
    if (!shouldFetch) return

    const content = await getRemoteFile(path)
    if (!content) {
      setCache((prev) => {
        const next = new Map(prev)
        next.set(path, { mdxSource: '', basePath: '', error: 'Could not load preview' })
        return next
      })
      return
    }

    const { content: mdxSource } = matter(content)
    const basePath = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''
    setCache((prev) => {
      const next = new Map(prev)
      next.set(path, { mdxSource, basePath })
      return next
    })
  }, [])

  const onPreviewClick = useCallback((path: string) => {
    setOpenPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
        return next
      }
      next.add(path)
      void ensurePreviewLoaded(path)
      return next
    })
  }, [ensurePreviewLoaded])

  const sectionTitle = useMemo(() => readerContentSectionTitle(entries), [entries])

  if (entries.length === 0) return null

  return (
    <div className="space-y-12" data-toc-ignore>
      <div className="flex items-center gap-4">
        <div className="w-2 h-8 bg-emerald-500 rounded-full" />
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{sectionTitle}</h2>
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-bold text-slate-500">
          {entries.length}
        </span>
      </div>
      <div className="space-y-6">
        {entries.map((entry) => {
          const path = entry.path
          const href = searchEntryHref(path)
          const title = pathTitle(entry)
          const isOpen = openPaths.has(path)
          const preview = cache.get(path)

          return (
            <section
              key={path}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 shadow-sm overflow-hidden"
            >
              <div className="flex items-start gap-4 p-6">
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-emerald-500 shrink-0">
                  <FileText size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <PtLink href={href} className="group-hover:text-blue-500 transition-colors">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {title}
                    </h3>
                  </PtLink>
                  <div className="text-sm text-slate-400 font-mono mt-1 truncate">{path}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onPreviewClick(path)}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  aria-expanded={isOpen}
                >
                  {isOpen ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  {isOpen ? 'Hide preview' : 'Preview'}
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-slate-200 dark:border-slate-800 px-8 py-6">
                  {preview?.loading && (
                    <div className="flex items-center justify-center py-12 text-slate-400">
                      <Loader2 className="animate-spin" size={20} />
                    </div>
                  )}
                  {preview?.error && (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8">{preview.error}</p>
                  )}
                  {preview?.mdxSource && !preview.loading && (
                    <article className="prose prose-slate dark:prose-invert max-w-none mdx-content max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <RelayMarkdown content={preview.mdxSource} basePath={preview.basePath} />
                    </article>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
