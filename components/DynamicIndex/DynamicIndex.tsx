'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PtLink } from '@/components/PtLink'
import { usePathname } from 'next/navigation'
import { useArticleNav } from '@/components/ArticleNav/ArticleNav'
import { scrollToHeadingById } from '@/lib/tocScroll'

export type DynamicIndexMode = 'sidebar' | 'inline' | 'menu'

interface DynamicIndexProps {
  currentPath?: string
  mode?: DynamicIndexMode
  /** Called after a heading jump (e.g. close mobile nav). */
  onAfterNavigate?: () => void
}

interface HeaderList extends Array<HeaderEntry> {}

interface HeaderEntry {
  id: string
  title: string
  children: HeaderList
}

function renderTocEntryNode (
  { title, id, children }: HeaderEntry,
  level: number,
  isMenu: boolean,
  onHeadingClick: (id: string) => void,
): React.ReactNode {
  const btnClass = isMenu
    ? `block w-full rounded-xl border-0 bg-transparent py-2 pr-3 text-left text-sm text-slate-600 transition-colors hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800/80 ${
        level > 1 ? 'text-[13px] opacity-90' : ''
      }`
    : `group block w-full cursor-pointer rounded-xl border-0 bg-transparent px-3 py-2 text-left no-underline transition-all duration-200 hover:bg-blue-600/10 dark:hover:bg-blue-500/20 ${
        level === 1
          ? 'mb-1 border border-slate-200/50 bg-white/50 text-sm font-bold text-blue-600 shadow-sm dark:border-white/5 dark:bg-white/5 dark:text-blue-400'
          : 'py-0 text-[11px] text-blue-600 opacity-80 hover:opacity-100 dark:text-blue-400'
      }`

  const padStyle = isMenu ? { paddingLeft: `${12 + Math.max(0, level - 1) * 12}px` } : undefined

  return (
    <React.Fragment key={id}>
      <li className="list-none">
        <button
          type="button"
          style={padStyle}
          className={btnClass}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onHeadingClick(id)
          }}
        >
          <span
            className={
              isMenu
                ? 'truncate'
                : 'flex items-center gap-2 transition-transform duration-200 group-hover:translate-x-1'
            }
          >
            <span className="truncate">{title}</span>
          </span>
        </button>
      </li>
      {children && children.length > 0 ? (
        <ul className="my-1 ml-4 list-none space-y-0.5 border-l border-slate-200 dark:border-slate-800/50">
          {children.map((child) => renderTocEntryNode(child, level + 1, isMenu, onHeadingClick))}
        </ul>
      ) : null}
    </React.Fragment>
  )
}

export default function DynamicIndex ({
  mode = 'inline',
  onAfterNavigate,
}: DynamicIndexProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [headerList, setHeaderList] = useState<HeaderList>([])
  const pathname = usePathname()
  const { prev, next } = useArticleNav()
  const isMenu = mode === 'menu'

  const onHeadingClick = useCallback(
    (id: string) => {
      scrollToHeadingById(id)
      onAfterNavigate?.()
    },
    [onAfterNavigate]
  )

  useEffect(() => {
    const { hash } = window.location

    const updateIndex = () => {
      const rootEl = wrapperRef.current
      if (!rootEl) return
      try {
        const list: HeaderList = generateHeaderList(
          rootEl,
          hash ? hash.substring(1) : undefined
        )
        setHeaderList(list)
      } catch {
        // main or headers not ready yet
      }
    }

    const timer = window.setTimeout(updateIndex, 350)

    const handleContentUpdate = () => {
      const retry = (attempt: number) => {
        const delay = 100 + attempt * 150
        window.setTimeout(() => {
          try {
            const rootEl = wrapperRef.current
            if (!rootEl) return
            const list = generateHeaderList(
              rootEl,
              hash ? hash.substring(1) : undefined
            )
            if (list.length > 0 || attempt >= 2) setHeaderList(list)
            else retry(attempt + 1)
          } catch {
            if (attempt < 2) retry(attempt + 1)
          }
        }, delay)
      }
      retry(0)
    }

    window.addEventListener('dynamic-index-update', handleContentUpdate)

    const main = document.querySelector('main')
    /** Browser timers are numeric; Node typings use `Timeout` for `setTimeout`. */
    let debounceTimer: number | undefined
    const obs = main
      ? new MutationObserver(() => {
          if (debounceTimer) window.clearTimeout(debounceTimer)
          debounceTimer = window.setTimeout(handleContentUpdate, 80)
        })
      : null
    if (obs && main) obs.observe(main, { childList: true, subtree: true })

    return () => {
      window.clearTimeout(timer)
      if (debounceTimer) window.clearTimeout(debounceTimer)
      window.removeEventListener('dynamic-index-update', handleContentUpdate)
      obs?.disconnect()
      setHeaderList([])
    }
  }, [pathname])

  const hidden = headerList.length === 0

  return (
    <div
      ref={wrapperRef}
      className={hidden ? 'hidden' : undefined}
      aria-hidden={hidden || undefined}
    >
      {!hidden && isMenu ? (
        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="mb-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            On this page
          </div>
          <ul
            className="flex max-h-[40vh] flex-col gap-0.5 overflow-y-auto px-2"
            aria-label="On this page"
          >
            {headerList.map((headerEntry) => renderTocEntryNode(headerEntry, 1, isMenu, onHeadingClick))}
          </ul>
        </div>
      ) : null}
      {!hidden && !isMenu ? (
        <ul
          className={`dynamic-index-container space-y-0 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/90 p-5 shadow-xl backdrop-blur-md transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/90 max-h-[calc(100vh-10rem)] ${
            mode === 'sidebar'
              ? 'hidden w-full toc:block'
              : 'mb-8 block max-w-2xl toc:hidden'
          }`}
        >
          <li className="mb-3 flex items-center justify-between gap-2 px-2 font-bold uppercase tracking-widest text-slate-400 text-[10px] dark:text-slate-500">
            <span>Table of Contents</span>
            {(prev || next) && (
              <span className="flex shrink-0 items-center gap-1">
                {prev && (
                  <PtLink
                    href={`/${prev.path}`}
                    title={prev.title}
                    className="whitespace-nowrap rounded bg-slate-200/80 px-2 py-1 text-[9px] text-slate-600 hover:bg-blue-500/20 hover:text-blue-600 dark:bg-slate-700/80 dark:text-slate-400 dark:hover:bg-blue-500/20 dark:hover:text-blue-400"
                  >
                    ← Prev
                  </PtLink>
                )}
                {next && (
                  <PtLink
                    href={`/${next.path}`}
                    title={next.title}
                    className="whitespace-nowrap rounded bg-slate-200/80 px-2 py-1 text-[9px] text-slate-600 hover:bg-blue-500/20 hover:text-blue-600 dark:bg-slate-700/80 dark:text-slate-400 dark:hover:bg-blue-500/20 dark:hover:text-blue-400"
                  >
                    Next →
                  </PtLink>
                )}
              </span>
            )}
          </li>
          {headerList.map((headerEntry) => renderTocEntryNode(headerEntry, 1, isMenu, onHeadingClick))}
        </ul>
      ) : null}
    </div>
  )
}

function generateHeaderList (rootEl: HTMLElement, scrollToHash?: string) {
  const contentElm =
    document.querySelector('main') || rootEl.closest('article, section, body')
  if (!contentElm) throw new Error('DynamicIndex contentElm not found')
  const list = contentElm.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const root: HeaderEntry = { id: 'root', title: 'root', children: [] }
  let lastByLevel: HeaderList = [root]
  const usedIds = new Set<string>()

  ;[].forEach.call(list, (headerElm: HTMLHeadingElement) => {
    if (headerElm.classList.contains('no-index')) {
      return
    }
    const { nodeName, textContent } = headerElm
    let id = headerElm.id

    if (!id) {
      id = `${textContent}`
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w-]+/g, '')
    }

    if (usedIds.has(id)) {
      const baseId = id
      let counter = 1
      while (usedIds.has(`${baseId}_${counter}`)) {
        counter++
      }
      id = `${baseId}_${counter}`
    }
    usedIds.add(id)
    headerElm.id = id

    const level = parseInt(nodeName.substring(1, 2), 10)
    const headerEntry: HeaderEntry = { id, title: textContent + '', children: [] }
    lastByLevel[level] = headerEntry

    lastByLevel = lastByLevel.splice(0, level + 1)

    let target: HeaderEntry | undefined
    for (let i = level - 1; i >= 0; i--) {
      target = lastByLevel[i]
      if (target) break
    }
    if (!target) throw new Error('Parent entry not found')
    target.children.push(headerEntry)

    headerElm.ondblclick = () => {
      scrollToHeadingById(id)
    }

    if (scrollToHash && id === scrollToHash) {
      scrollToHeadingById(id, 'auto')
    }
  })
  return root.children
}
