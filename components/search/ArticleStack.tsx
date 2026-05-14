'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, Loader2 } from 'lucide-react'
import { RelayMarkdown } from '@/components/RelayMarkdown'

interface ArticleStackProps {
  renderedMds: Array<{ path: string; mdxSource: string; basePath: string; title?: string }>
  contentLoading: boolean
  totalArticles: number
}

export function ArticleStack ({ renderedMds, contentLoading, totalArticles }: ArticleStackProps) {
  if (renderedMds.length === 0 && !contentLoading) return null

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4">
        <div className="w-2 h-8 bg-emerald-500 rounded-full" />
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Articles</h2>
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-bold text-slate-500">
          {totalArticles}
        </span>
        {contentLoading && <Loader2 className="animate-spin text-emerald-500" size={24} />}
      </div>
      <div className="space-y-24">
        {renderedMds.map(({ path, mdxSource, basePath, title }) => (
          <section key={path} className="relative group">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-emerald-500">
                <FileText size={24} />
              </div>
              <div>
                <Link href={`/${path}`} className="group-hover:text-blue-500 transition-colors">
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {title || path.split('/').pop()?.replace('.md', '').replace(/_/g, ' ')}
                  </h3>
                </Link>
                <div className="text-sm text-slate-400 font-mono mt-1">{path}</div>
              </div>
            </div>
            <article className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-900/30 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mdx-content max-h-[80vh] overflow-y-auto custom-scrollbar">
              <RelayMarkdown content={typeof mdxSource === 'string' ? mdxSource : ''} basePath={basePath} />
            </article>
          </section>
        ))}
      </div>
      {totalArticles > renderedMds.length && !contentLoading && (
        <div className="text-center py-8">
          <p className="text-slate-500 italic">... and {totalArticles - renderedMds.length} more articles. Be more specific for more results.</p>
        </div>
      )}
    </div>
  )
}
