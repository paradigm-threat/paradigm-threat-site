'use client'

/**
 * Legacy ChatRoom stub — community chat moved to park mesh IRC.
 * Markdown embeds and old imports render a link instead of Relay-git chat.
 */
import React from 'react'
import { chatSiteHref } from '@/lib/siteChromeNav'

interface ChatRoomProps {
  channel?: string
  title?: string
  className?: string
  mode?: string
}

function meshChannel (raw?: string): string {
  const s = String(raw || 'general')
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9_\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  if (!s || s === 'general') return 'pt-general'
  if (s.startsWith('pt-')) return s
  return `pt-${s}`
}

export default function ChatRoom ({ channel, title, className }: ChatRoomProps) {
  const ch = meshChannel(channel)
  const href = chatSiteHref(`/chat?c=${encodeURIComponent(ch)}`)
  const label = title?.trim() || `Open chat #${ch}`
  return (
    <p className={className || 'chat-room-moved'}>
      <a href={href} rel="noopener noreferrer">
        {label}
      </a>
      {' — '}
      community chat now runs on paradigmthreat.net mesh IRC (history imported).
    </p>
  )
}
