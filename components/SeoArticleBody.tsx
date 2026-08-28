'use client'

import React, { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { resolveSeoArticleInternalNavHref } from '@/lib/resolveSeoArticleInternalNavHref'

export function SeoArticleBody ({ html }: { html: string }) {
  const router = useRouter()
  const articleRef = useRef<HTMLDivElement>(null)

  const onClickCapture = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.button !== 0) return

      const el = e.target
      if (!(el instanceof Element) || !articleRef.current) return

      const a = el.closest('a[href]')
      if (!a || !articleRef.current.contains(a)) return
      if (a.hasAttribute('download')) return

      const targetAttr = a.getAttribute('target')
      if (targetAttr === '_blank' || targetAttr === '_parent' || targetAttr === '_top') return

      const href = a.getAttribute('href')
      if (!href) return

      const path = resolveSeoArticleInternalNavHref(href, window.location.origin)
      if (path == null) return

      e.preventDefault()
      router.push(path)
    },
    [router]
  )

  return (
    <div
      ref={articleRef}
      className="seo-article mdx-content"
      data-seo-fallback="true"
      suppressHydrationWarning
      onClickCapture={onClickCapture}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
