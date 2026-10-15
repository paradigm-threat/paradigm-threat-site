'use client'

import { useEffect, useState } from 'react'

const INDEX_URL = 'https://flashbackrepository.org/index.json'
const ORIGIN = 'https://flashbackrepository.org'

type NowItem = { slug: string; title: string; href: string }

function titleFromSlug (slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function FlashbackNowShowing () {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [items, setItems] = useState<NowItem[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(INDEX_URL, { cache: 'default' })
      .then((res) => {
        if (!res.ok) throw new Error('index fetch failed')
        return res.json()
      })
      .then((json: { nowShowing?: string[]; projects?: Array<{ slug?: string; title?: string }> }) => {
        if (cancelled) return
        const slugs = Array.isArray(json?.nowShowing) ? json.nowShowing : []
        const projects = Array.isArray(json?.projects) ? json.projects : []
        const bySlug = new Map<string, { title?: string }>()
        for (const p of projects) {
          if (p?.slug) bySlug.set(p.slug, p)
        }
        const next: NowItem[] = []
        for (const slug of slugs) {
          if (typeof slug !== 'string' || !slug) continue
          const p = bySlug.get(slug)
          next.push({
            slug,
            title: (p?.title && p.title.trim()) || titleFromSlug(slug),
            href: `${ORIGIN}/${slug}`,
          })
        }
        setItems(next)
        setStatus('ok')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section
      className="my-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      aria-label="Flashback Repository now showing"
      data-pt-flashback-ssr="1"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="m-0 text-base font-bold text-slate-900 dark:text-slate-100">
          Now showing
        </h3>
        <a
          className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          href={`${ORIGIN}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Flashback Repository →
        </a>
      </div>
      {status === 'loading' ? (
        <p className="m-0 text-sm text-slate-500 dark:text-slate-400">Loading Now showing…</p>
      ) : null}
      {status === 'error' ? (
        <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
          Could not load the live list.{' '}
          <a
            href={`${ORIGIN}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open Flashback Repository
          </a>
          .
        </p>
      ) : null}
      {status === 'ok' && items.length === 0 ? (
        <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
          Nothing listed as Now showing right now — browse the{' '}
          <a href={`${ORIGIN}/`} target="_blank" rel="noopener noreferrer" className="underline">
            full library
          </a>
          .
        </p>
      ) : null}
      {status === 'ok' && items.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Now showing titles">
          {items.map((it) => (
            <li key={it.slug} className="m-0 text-[0.95rem] leading-snug">
              <a
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-800 underline decoration-slate-400 underline-offset-2 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-400"
              >
                {it.title}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
