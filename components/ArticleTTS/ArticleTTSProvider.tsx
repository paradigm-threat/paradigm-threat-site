'use client'

import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { useTTS } from '@/lib/hooks/useTTS'
import type { TTSState, SubtitleMode, PiperVoice, TTSProvider } from '@/lib/hooks/useTTS'
import { stripMarkdownForTTS } from '@/components/Timeline/ttsHelpers'
import {
  writeLastVisit,
  writeTtsResume,
  readTtsResume,
  shouldPersistVisit,
} from '@/lib/visitResumeStorage'

export interface ArticleTTSContext {
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onPlayFromSentence: (sentenceIndex: number) => void
  isPlaying: boolean
  currentSentenceIndex: number
  sentences: string[]
  error: string | null
  onClearError: () => void
  ttsState: TTSState
  availableVoices: SpeechSynthesisVoice[]
  availablePiperVoices: PiperVoice[]
  setVoice: (v: SpeechSynthesisVoice | null) => void
  setRate: (r: number) => void
  setProvider: (p: TTSProvider) => void
  setPiperVoiceId: (id: string) => void
  setPiperLang: (lang: string) => void
  setQuoteVoiceId: (id: string) => void
  setSpeakerMapInput: (input: string) => void
  setLangFilter: (l: string) => void
  setLocalOnly: (b: boolean) => void
  setSubtitleMode: (m: SubtitleMode) => void
  switchToSpeechAndResume?: () => void
  retry: () => void
}

export interface ArticleTTSProviderProps {
  articleTitle: string
  articleContent: string
  basePath: string
  /** When set, records this article as the last visit (non-hub paths) and optional TTS resume position. */
  persistVisit?: { pathname: string; title: string } | null
  children: (ctx: ArticleTTSContext) => React.ReactNode
}

export function ArticleTTSProvider({
  articleTitle,
  articleContent,
  basePath: _basePath,
  persistVisit = null,
  children,
}: ArticleTTSProviderProps) {
  const tts = useTTS()
  const ttsRef = useRef(tts)
  useEffect(() => {
    ttsRef.current = tts
  }, [tts])

  const segment = useMemo(() => ({
    id: 'article',
    title: articleTitle,
    text: stripMarkdownForTTS(articleContent, articleTitle),
  }), [articleTitle, articleContent])

  const handlePlay = useCallback(() => {
    const {
      isPlaying,
      currentSegmentIndex,
      currentSentenceIndex,
      sentences,
      segments: loadedSegments,
    } = tts.state
    const loadedText = loadedSegments[0]?.text
    const sameArticle =
      loadedText !== undefined && loadedText === segment.text && loadedSegments[0]?.id === segment.id

    if (
      !isPlaying &&
      sentences.length > 0 &&
      currentSegmentIndex >= 0 &&
      sameArticle
    ) {
      tts.playFromSentence([segment], 0, Math.max(0, currentSentenceIndex))
      return
    }
    tts.play([segment], 0)
  }, [tts, segment])

  const handleStop = useCallback(() => {
    tts.stop()
    tts.clearError()
  }, [tts])

  const handlePlayFromSentence = useCallback((sentenceIndex: number) => {
    tts.playFromSentence([segment], 0, sentenceIndex)
  }, [tts, segment])

  useEffect(
    () => () => ttsRef.current.stop(),
    []
  )

  // Remember last article (home / thirdstory hub resume link)
  useEffect(() => {
    if (!persistVisit || !shouldPersistVisit(persistVisit.pathname)) return
    writeLastVisit(persistVisit.pathname, persistVisit.title || articleTitle)
  }, [persistVisit, articleTitle])

  // Persist TTS position for "Resume playback" (article = single segment index 0)
  const {
    isPlaying: ttsIsPlaying,
    currentSentenceIndex: ttsSentenceIdx,
    currentSegmentIndex: ttsSegIdx,
    sentences: ttsSentences,
  } = tts.state
  useEffect(() => {
    if (!persistVisit || !shouldPersistVisit(persistVisit.pathname)) return
    if (ttsSentences.length === 0) return
    if (!ttsIsPlaying && ttsSentenceIdx < 0) return
    writeTtsResume({
      kind: 'article',
      path: persistVisit.pathname,
      segmentIndex: ttsSegIdx >= 0 ? ttsSegIdx : 0,
      sentenceIndex: Math.max(0, ttsSentenceIdx),
      title: persistVisit.title || articleTitle,
    })
  }, [
    persistVisit,
    articleTitle,
    ttsIsPlaying,
    ttsSentenceIdx,
    ttsSegIdx,
    ttsSentences.length,
  ])

  const resumeAppliedRef = useRef(false)
  useEffect(() => {
    resumeAppliedRef.current = false
  }, [persistVisit?.pathname])

  useEffect(() => {
    if (!persistVisit || !shouldPersistVisit(persistVisit.pathname)) return
    if (typeof window === 'undefined') return
    if (resumeAppliedRef.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('resumeTts') !== '1') return
    const saved = readTtsResume()
    if (!saved || saved.path !== persistVisit.pathname || saved.sentenceIndex < 0) return
    resumeAppliedRef.current = true
    params.delete('resumeTts')
    const q = params.toString()
    window.history.replaceState(null, '', persistVisit.pathname + (q ? `?${q}` : ''))
    const t = window.setTimeout(() => {
      handlePlayFromSentence(saved.sentenceIndex)
    }, 400)
    return () => window.clearTimeout(t)
  }, [persistVisit, handlePlayFromSentence])

  return (
    <>
      {children({
        onPlay: handlePlay,
        onPause: tts.pause,
        onStop: handleStop,
        onPlayFromSentence: handlePlayFromSentence,
        isPlaying: tts.state.isPlaying,
        currentSentenceIndex: tts.state.currentSentenceIndex,
        sentences: tts.state.sentences,
        error: tts.state.error,
        onClearError: tts.clearError,
        ttsState: tts.state,
        availableVoices: tts.availableVoices,
        availablePiperVoices: tts.availablePiperVoices,
        setVoice: tts.setVoice,
        setRate: tts.setRate,
        setProvider: tts.setProvider,
        setPiperVoiceId: tts.setPiperVoiceId,
        setPiperLang: tts.setPiperLang,
        setQuoteVoiceId: tts.setQuoteVoiceId,
        setSpeakerMapInput: tts.setSpeakerMapInput,
        setLangFilter: tts.setLangFilter,
        setLocalOnly: tts.setLocalOnly,
        setSubtitleMode: tts.setSubtitleMode,
        switchToSpeechAndResume: tts.switchToSpeechAndResume,
        retry: tts.retry,
      })}
    </>
  )
}
