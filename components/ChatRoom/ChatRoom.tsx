'use client'

/**
 * Markdown `<ChatRoom channel="…" />` → mesh LiveChat on #pt-<topic>.
 * Loads park tip hosts from paradigmthreat.net (same channel map as ChatRoomLive).
 */
import React, { useEffect, useState } from 'react'
import { meshChannelFromChatRoom } from '@/lib/chat/chatMeshChannel'
import { CHAT_SITE_ORIGIN, chatSiteHref } from '@/lib/siteChromeNav'

export { meshChannelFromChatRoom }

interface ChatRoomProps {
  channel?: string
  title?: string
  className?: string
  mode?: string
}

const CHAT_COMMON_SRC = `${CHAT_SITE_ORIGIN}/hooks/client/native/ChatCommon.host.js`
const LIVE_CHAT_SRC = `${CHAT_SITE_ORIGIN}/hooks/client/native/LiveChat.host.js`

function loadParkChatScript (src: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-pt-chat-src="${src}"]`,
    ) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === '1') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      )
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.dataset.ptChatSrc = src
    s.onload = () => {
      s.dataset.loaded = '1'
      resolve()
    }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

function kickLiveChatUpgrade (): void {
  try {
    const w = window as Window & {
      __fbScheduleParkNativeReupgrade?: () => void
    }
    if (typeof w.__fbScheduleParkNativeReupgrade === 'function') {
      w.__fbScheduleParkNativeReupgrade()
    }
  } catch {
    /* ignore */
  }
}

export default function ChatRoom ({
  channel,
  title,
  className,
  mode,
}: ChatRoomProps) {
  const ch = meshChannelFromChatRoom(channel)
  const href = chatSiteHref(`/chat?c=${encodeURIComponent(ch)}`)
  const label = title?.trim() || `Live chat #${ch}`
  const embedMode = mode?.trim() || 'embed'
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await loadParkChatScript(CHAT_COMMON_SRC)
        await loadParkChatScript(LIVE_CHAT_SRC)
        if (cancelled) return
        kickLiveChatUpgrade()
        // Host scans on an interval; nudge again after layout.
        window.setTimeout(kickLiveChatUpgrade, 200)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ch])

  return (
    <div
      className={className || 'pt-chatroom-live'}
      aria-label={label}
      data-pt-chatroom="1"
      data-channel={ch}
    >
      <div
        className="fb-live-chat-host"
        data-relay-park-native="fb-live-chat"
        data-channel={ch}
        data-prefix="pt"
        data-path="/"
        data-mode={embedMode}
        data-title={label}
        data-chat-origin={CHAT_SITE_ORIGIN}
      />
      {failed ? (
        <p className="chat-room-moved">
          <a href={href} rel="noopener noreferrer">
            {label}
          </a>
          {' — '}
          community chat on paradigmthreat.net mesh IRC.
        </p>
      ) : (
        <p className="chat-room-fallback">
          <a href={href} rel="noopener noreferrer">
            Open full chat
          </a>
          <span className="chat-room-fallback-meta"> #{ch}</span>
        </p>
      )}
    </div>
  )
}
