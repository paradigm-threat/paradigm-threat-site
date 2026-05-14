'use client'

import React, { useState } from 'react'
import { RelayMarkdown } from '@/components/RelayMarkdown'
import { SeoArticleBody } from '@/components/SeoArticleBody'

export interface ArticleMarkdownRegionProps {
  seoHtml: string
  content: string
  basePath?: string
  sourcePath?: string
}

/**
 * Crawlers and compile-error fallback use server `seo-article` HTML.
 * WASM replaces SEO on success; on compile error, error UI stays visible with SEO below.
 */
export function ArticleMarkdownRegion ({
  seoHtml,
  content,
  basePath = '',
  sourcePath,
}: ArticleMarkdownRegionProps) {
  const [clientReady, setClientReady] = useState(false)
  const [compileError, setCompileError] = useState(false)

  const showSeo = !clientReady || compileError
  const wasmClass =
    clientReady && !compileError
      ? 'mdx-content'
      : compileError
        ? 'mb-6'
        : 'sr-only'

  return (
    <div className="article-markdown-region relative">
      <div
        className={wasmClass}
        aria-hidden={!clientReady && !compileError}
      >
        <RelayMarkdown
          content={content}
          basePath={basePath}
          sourcePath={sourcePath}
          className="mdx-content"
          onReady={() => {
            setCompileError(false)
            setClientReady(true)
          }}
          onCompileError={() => {
            setCompileError(true)
            setClientReady(false)
          }}
        />
      </div>
      {showSeo ? <SeoArticleBody html={seoHtml} /> : null}
    </div>
  )
}
