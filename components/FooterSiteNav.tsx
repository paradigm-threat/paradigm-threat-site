'use client'

import Link from 'next/link'
import { isChatDisabled } from '@/lib/siteOpsFeature'
import { useReplyAssistantAvailable } from '@/lib/replyAssistant/useReplyAssistantAvailable'

const linkClass =
  'shrink-0 hover:text-slate-900 dark:hover:text-white transition-colors'

function ReplyNavLink () {
  const available = useReplyAssistantAvailable()
  if (!available) return null
  return (
    <Link href="/reply" className={linkClass}>
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
      <Link href="/search" className={linkClass}>
        Search
      </Link>
      <Link href="/submit" className={linkClass}>
        Submit
      </Link>
      <ReplyNavLink />
      <Link href="/" className={linkClass}>
        Home
      </Link>
      <Link href="/timeline" className={linkClass}>
        Timeline
      </Link>
      {isChatDisabled() ? (
        <span className="shrink-0 text-slate-400 dark:text-slate-500" title="Chat disabled until Relay migration">
          Chat (paused)
        </span>
      ) : (
        <Link href="/chat" className={linkClass}>
          Chat
        </Link>
      )}
      <Link
        href="https://paradigmthreat2.substack.com/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Substack
      </Link>
      <Link
        href="https://www.bitchute.com/channel/paradigmthreat"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Videos
      </Link>
    </nav>
  )
}
