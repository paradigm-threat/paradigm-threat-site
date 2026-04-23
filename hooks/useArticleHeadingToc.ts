'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { collectArticleTocEntries, type TocEntry } from '@/lib/tocScroll'

/**
 * Live heading list under `main article` (MDX hubs), for mobile nav “On this page”.
 */
export function useArticleHeadingToc (): {
  entries: TocEntry[]
  refresh: () => void
} {
  const pathname = usePathname()
  const [entries, setEntries] = useState<TocEntry[]>([])
  const debounceRef = useRef<number | null>(null)

  const refresh = useCallback(() => {
    try {
      setEntries(collectArticleTocEntries())
    } catch {
      setEntries([])
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      refresh()
    })
    const t = window.setTimeout(refresh, 400)

    const root = document.querySelector('main article')
    const obs = root
      ? new MutationObserver(() => {
          if (debounceRef.current) window.clearTimeout(debounceRef.current)
          debounceRef.current = window.setTimeout(() => {
            debounceRef.current = null
            refresh()
          }, 120)
        })
      : null
    if (obs && root) obs.observe(root, { childList: true, subtree: true })

    return () => {
      window.clearTimeout(t)
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      obs?.disconnect()
    }
  }, [pathname, refresh])

  return { entries, refresh }
}
