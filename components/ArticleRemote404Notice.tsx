'use client'

import React from 'react'
import Link from 'next/link'

const CENSORSHIP_IMAGES = [
  'influence/censorship/github-ban.png',
  'influence/censorship/github-ban2.png',
] as const

/** Permalinks on GitHub for the same files (evidence / source of truth). */
const GITHUB_FILE_URLS = [
  'https://github.com/clevertree/paradigm-threat-files/blob/main/influence/censorship/github-ban.png',
  'https://github.com/clevertree/paradigm-threat-files/blob/main/influence/censorship/github-ban2.png',
] as const

function filesAssetUrl(relativePath: string): string {
  const base = (process.env.NEXT_PUBLIC_FILES_BASE_URL || 'https://clevertree.github.io/paradigm-threat-files').replace(
    /\/$/,
    ''
  )
  return `${base}/${relativePath.replace(/^\//, '')}`
}

export interface ArticleRemote404NoticeProps {
  /** Refetch this route’s article from the API (and re-run directory resolution). */
  onRetry?: () => void
}

/**
 * Shown when the article API returns 404 (remote markdown/images unavailable).
 * Not used for directory listings or non-404 errors.
 */
export function ArticleRemote404Notice({ onRetry }: ArticleRemote404NoticeProps) {
  return (
    <div className="py-10 space-y-8 text-left max-w-2xl mx-auto">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 p-6 space-y-4 text-slate-800 dark:text-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Content unavailable (404)</h2>
        <p className="text-sm leading-relaxed">
          I keep seeing my material flagged for abuse by hosts and intermediaries—often with no notice, no letter, and
          no explanation. So far that pattern has shown up on every network I&apos;ve tried, without exception.
        </p>
        <p className="text-sm leading-relaxed">
          A 404 here usually means the static file never reached your browser: throttling, opaque blocks, or silent
          takedowns—not that I got the path wrong in the repo.
        </p>
        <p className="text-sm leading-relaxed">
          Honestly, the censorship has been a constant weathervane for which direction I should take next. As far as the
          technical challenges go, I love them—please, bring them on. I&apos;m not going to run out of IP addresses
          anytime soon, and it really doesn&apos;t look as if the people trying to contain this have many tricks left in
          the bag.
        </p>
        <p className="text-sm leading-relaxed">
          Everything seems to point to me being closer than ever to some sort of real breakthrough.
          If that&apos;s what they&apos;re trying to avoid, they&apos;re not doing a good enough job. And by
          &quot;they,&quot; I mean you—the reader—if you&apos;re one of them.
        </p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          I&apos;m moving toward self-hosted files; leaning on a single cloud edge is fragile when the edge simply stops
          answering. I&apos;m also pushing mirrors to GitLab: GitHub is owned by Microsoft, and I don&apos;t need my
          publishing chain to depend on that stack alone. In the past, the GitLab CEO has reportedly said the company
          intends to &quot;continue to work with clients regardless of their political beliefs&quot;—I&apos;m not
          treating any host as a friend, but that line is part of why GitLab is in the mix while I sort out my own
          hosting.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Retry loading this page
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Retry (reload)
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          GitHub-side restrictions (examples — same files on GitHub)
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CENSORSHIP_IMAGES.map((src, i) => (
            <div
              key={src}
              className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800"
            >
              <a
                href={GITHUB_FILE_URLS[i]}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-95 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={filesAssetUrl(src)}
                  alt={`GitHub restriction screenshot ${i + 1}`}
                  className="w-full h-auto object-contain max-h-64 bg-black/5 dark:bg-black/20"
                />
              </a>
              <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700">
                <a
                  href={GITHUB_FILE_URLS[i]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  {GITHUB_FILE_URLS[i]}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-2">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          Back to home
        </Link>
      </div>
    </div>
  )
}
