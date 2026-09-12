'use client'

import Link from 'next/link'
import { useReplyAssistantAvailable } from '@/lib/replyAssistant/useReplyAssistantAvailable'
import { SITE_CHROME_NAV, archiveSiteHref } from '@/lib/siteChromeNav'

const linkClass =
  'shrink-0 hover:text-slate-900 dark:hover:text-white transition-colors'

function ReplyNavLink () {
  const available = useReplyAssistantAvailable()
  if (!available) return null
  return (
    <Link href={archiveSiteHref('/reply')} className={linkClass}>
      Reply
    </Link>
  )
}

export function FooterSiteNav () {
  return (
    <nav
      aria-label="Site"
      className="flex max-w-full flex-wrap justify-center gap-x-4 gap-y-2 px-1 text-sm text-slate-600 dark:text-slate-400 sm:gap-x-6 sm:text-base"
    >
      <Link href={SITE_CHROME_NAV.search} className={linkClass}>
        Search
      </Link>
      <Link href={SITE_CHROME_NAV.submit} className={linkClass}>
        Submit
      </Link>
      <ReplyNavLink />
      <Link href={SITE_CHROME_NAV.home} className={linkClass}>
        Home
      </Link>
      <Link href={SITE_CHROME_NAV.timeline} className={linkClass}>
        Timeline
      </Link>
      <Link href={SITE_CHROME_NAV.chat} className={linkClass}>
        Chat
      </Link>
      <Link
        href={SITE_CHROME_NAV.substack}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Substack
      </Link>
      <Link
        href={SITE_CHROME_NAV.videos}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Videos
      </Link>
    </nav>
  )
}
