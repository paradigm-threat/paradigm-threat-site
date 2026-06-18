'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { SiteAiPageContext } from '@/lib/siteAi/askSiteAi'
import {
  appendSiteAiMessages,
  clearSiteAiSession,
  createSiteAiMessageId,
  loadSiteAiSession,
  saveSiteAiSession,
  type SiteAiStoredMessage,
} from '@/lib/siteAi/siteAiSessionStorage'

type SiteAiContextValue = {
  open: boolean
  openModal: () => void
  closeModal: () => void
  messages: SiteAiStoredMessage[]
  setMessages: (messages: SiteAiStoredMessage[]) => void
  appendExchange: (userText: string, assistantText: string) => void
  clearHistory: () => void
  pageContext: SiteAiPageContext | null
  setPageContext: (ctx: SiteAiPageContext | null) => void
}

const SiteAiContext = createContext<SiteAiContextValue | null>(null)

export function SiteAiProvider ({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessagesState] = useState<SiteAiStoredMessage[]>([])
  const [pageContext, setPageContextState] = useState<SiteAiPageContext | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setMessagesState(loadSiteAiSession())
      setHydrated(true)
    })
  }, [])

  const setMessages = useCallback((next: SiteAiStoredMessage[]) => {
    setMessagesState(next)
    if (hydrated) saveSiteAiSession(next)
  }, [hydrated])

  const appendExchange = useCallback((userText: string, assistantText: string) => {
    setMessagesState((prev) => {
      const additions: SiteAiStoredMessage[] = [
        { id: createSiteAiMessageId(), role: 'user', content: userText, createdAt: Date.now() },
        { id: createSiteAiMessageId(), role: 'assistant', content: assistantText, createdAt: Date.now() },
      ]
      return appendSiteAiMessages(prev, additions)
    })
  }, [])

  const clearHistory = useCallback(() => {
    clearSiteAiSession()
    setMessagesState([])
  }, [])

  const value = useMemo<SiteAiContextValue>(() => ({
    open,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
    messages,
    setMessages,
    appendExchange,
    clearHistory,
    pageContext,
    setPageContext: setPageContextState,
  }), [open, messages, setMessages, appendExchange, clearHistory, pageContext])

  return (
    <SiteAiContext.Provider value={value}>
      {children}
    </SiteAiContext.Provider>
  )
}

export function useSiteAi (): SiteAiContextValue {
  const ctx = useContext(SiteAiContext)
  if (!ctx) {
    throw new Error('useSiteAi must be used within SiteAiProvider')
  }
  return ctx
}

export function useSiteAiPageContextRegistration (
  ctx: SiteAiPageContext | null
): void {
  const { setPageContext } = useSiteAi()
  useEffect(() => {
    setPageContext(ctx)
    return () => setPageContext(null)
  }, [ctx, setPageContext])
}
