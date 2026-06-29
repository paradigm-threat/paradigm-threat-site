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

import type { SiteAiSearchContext, SiteAiSearchIntent } from '@/lib/search/searchChatIntents'

type SiteAiOpenOptions = {
  question?: string
  autoSubmit?: boolean
  presentation?: 'default' | 'expanded'
  intent?: SiteAiSearchIntent
  searchContext?: SiteAiSearchContext
  startSubmissionMode?: boolean
}

type SiteAiContextValue = {
  open: boolean
  openModal: (options?: SiteAiOpenOptions) => void
  closeModal: () => void
  openOptions: SiteAiOpenOptions | null
  presentation: 'default' | 'expanded'
  activeSearchContext: SiteAiSearchContext | null
  clearOpenOptions: () => void
  messages: SiteAiStoredMessage[]
  setMessages: (messages: SiteAiStoredMessage[]) => void
  appendExchange: (userText: string, assistantText: string) => void
  clearHistory: () => void
  pageContext: SiteAiPageContext | null
  setPageContext: (ctx: SiteAiPageContext | null) => void
  replyMode: boolean
  enterReplyMode: () => void
  setReplyMode: (value: boolean) => void
  submissionMode: boolean
  enterSubmissionMode: () => void
  setSubmissionMode: (value: boolean) => void
}

const SiteAiContext = createContext<SiteAiContextValue | null>(null)

export function SiteAiProvider ({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [openOptions, setOpenOptions] = useState<SiteAiOpenOptions | null>(null)
  const [presentation, setPresentation] = useState<'default' | 'expanded'>('default')
  const [activeSearchContext, setActiveSearchContext] = useState<SiteAiSearchContext | null>(null)
  const [messages, setMessagesState] = useState<SiteAiStoredMessage[]>([])
  const [pageContext, setPageContextState] = useState<SiteAiPageContext | null>(null)
  const [replyMode, setReplyModeState] = useState(false)
  const [submissionMode, setSubmissionModeState] = useState(false)
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
    setReplyModeState(false)
    setSubmissionModeState(false)
  }, [])

  const enterReplyMode = useCallback(() => {
    setReplyModeState(true)
  }, [])

  const setReplyMode = useCallback((value: boolean) => {
    setReplyModeState(value)
  }, [])

  const enterSubmissionMode = useCallback(() => {
    setSubmissionModeState(true)
  }, [])

  const setSubmissionMode = useCallback((value: boolean) => {
    setSubmissionModeState(value)
  }, [])

  const clearOpenOptions = useCallback(() => {
    setOpenOptions(null)
  }, [])

  const value = useMemo<SiteAiContextValue>(() => ({
    open,
    openModal: (options) => {
      setOpenOptions(options ?? null)
      setPresentation(options?.presentation ?? 'default')
      if (options?.searchContext) setActiveSearchContext(options.searchContext)
      if (options?.startSubmissionMode) setSubmissionModeState(true)
      setOpen(true)
    },
    closeModal: () => {
      setOpen(false)
      setOpenOptions(null)
      setPresentation('default')
    },
    openOptions,
    presentation,
    activeSearchContext,
    clearOpenOptions,
    messages,
    setMessages,
    appendExchange,
    clearHistory,
    pageContext,
    setPageContext: setPageContextState,
    replyMode,
    enterReplyMode,
    setReplyMode,
    submissionMode,
    enterSubmissionMode,
    setSubmissionMode,
  }), [open, openOptions, presentation, activeSearchContext, clearOpenOptions, messages, setMessages, appendExchange, clearHistory, pageContext, replyMode, enterReplyMode, setReplyMode, submissionMode, enterSubmissionMode, setSubmissionMode])

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

export type { SiteAiSearchContext, SiteAiSearchIntent } from '@/lib/search/searchChatIntents'

export function useSiteAiPageContextRegistration (
  ctx: SiteAiPageContext | null
): void {
  const { setPageContext } = useSiteAi()
  useEffect(() => {
    setPageContext(ctx)
    return () => setPageContext(null)
  }, [ctx, setPageContext])
}
