'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Play, Pause, Square, ChevronUp, Settings2, X } from 'lucide-react'
import type { TTSState, SubtitleMode, PiperVoice, TTSProvider } from '@/lib/hooks/useTTS'
import { useBottomChrome } from '@/lib/BottomChromeContext'
import { useHubResumeChrome } from '@/lib/hooks/useHubResumeChrome'

const RATES = [0.75, 1.0, 1.25, 1.5, 2.0]

function getPiperVoiceOptionLabel(voice: PiperVoice): string {
  if (voice.name?.trim()) return voice.name.trim()
  if (voice.voice && (voice.lang || voice.language)) {
    const lang = voice.lang ?? voice.language ?? ''
    return `${voice.voice} (${lang})`
  }
  return voice.id
}

export interface ArticleTTSOverlayProps {
  ttsState: TTSState
  availableVoices: SpeechSynthesisVoice[]
  availablePiperVoices: PiperVoice[]
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onClearError: () => void
  onSeekToSentence: (sentenceIndex: number) => void
  sentences: string[]
  currentSentenceIndex: number
  onRetry?: () => void
  onSetVoice: (v: SpeechSynthesisVoice | null) => void
  onSetRate: (r: number) => void
  onSetProvider: (p: TTSProvider) => void
  onSetPiperVoiceId: (id: string) => void
  onSetPiperLang: (lang: string) => void
  onSetQuoteVoiceId: (id: string) => void
  onSetSpeakerMapInput: (input: string) => void
  onSetLangFilter: (l: string) => void
  onSetLocalOnly: (b: boolean) => void
  onSetSubtitleMode: (m: SubtitleMode) => void
  onSwitchToSpeechAndResume?: () => void
  onScrollToTop: () => void
  isScrolled: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ArticleTTSOverlay({
  ttsState,
  availableVoices,
  availablePiperVoices,
  onPlay,
  onPause,
  onStop,
  onClearError,
  onSetVoice,
  onSetRate,
  onSetProvider,
  onSetPiperVoiceId,
  onSetPiperLang,
  onSetQuoteVoiceId,
  onSetSpeakerMapInput,
  onSetLangFilter,
  onSetLocalOnly,
  onSetSubtitleMode,
  onSwitchToSpeechAndResume,
  onScrollToTop,
  isScrolled,
  onSeekToSentence,
  sentences,
  currentSentenceIndex,
  onRetry,
}: ArticleTTSOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { isHub, setTtsDockHeightPx } = useBottomChrome()
  const hubResume = useHubResumeChrome()
  const [expanded, setExpanded] = useState(false)
  const [seekValue, setSeekValue] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!isHub) {
      setTtsDockHeightPx(0)
      return
    }
    const el = rootRef.current
    if (!el) return

    const publish = () => {
      const rect = el.getBoundingClientRect()
      setTtsDockHeightPx(Math.ceil(window.innerHeight - rect.top))
    }

    const ro = new ResizeObserver(publish)
    ro.observe(el)
    window.addEventListener('resize', publish)
    publish()

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', publish)
      setTtsDockHeightPx(0)
    }
  }, [isHub, setTtsDockHeightPx])
  const totalSentences = sentences.length
  const displayIndex = seekValue !== null ? seekValue : currentSentenceIndex

  const showHubResumeInline =
    isHub &&
    (hubResume.showResumePage || hubResume.showResumePlayback) &&
    !hubResume.dismissed &&
    !hubResume.hiddenByScroll

  const filteredVoices = availableVoices
    .filter(v => ttsState.langFilter === 'all' || v.lang.startsWith(ttsState.langFilter))
    .filter(v => !ttsState.localOnly || v.localService)

  const filteredPiperVoices = availablePiperVoices

  return (
    <div
      ref={rootRef}
      className="fixed bottom-0 left-0 right-0 z-50 box-border w-full max-w-[100vw] px-1 sm:px-0 lg:left-auto lg:right-8 lg:bottom-8 lg:max-w-md lg:px-0"
    >
      {/* Error banner */}
      {ttsState.error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-950/90 border border-red-500/50 text-red-100 px-4 py-3 flex items-center justify-between gap-4 shadow-xl">
          <span className="text-sm flex-1 min-w-0 truncate">{ttsState.error}</span>
          <div className="flex items-center gap-2 shrink-0">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs uppercase font-bold bg-amber-600/80 hover:bg-amber-500/90 px-2 py-1 rounded text-amber-100"
              >
                Retry
              </button>
            )}
            {ttsState.provider === 'piper' && ttsState.piperFallbackOffer && onSwitchToSpeechAndResume && (
              <button
                onClick={onSwitchToSpeechAndResume}
                className="text-xs uppercase font-bold bg-indigo-600/80 hover:bg-indigo-500/90 px-2 py-1 rounded"
              >
                Speech API &amp; Resume
              </button>
            )}
            {ttsState.provider === 'piper' && !ttsState.piperFallbackOffer && (
              <button
                onClick={() => onSetProvider('webSpeech')}
                className="text-xs uppercase font-bold text-red-300 hover:text-red-100"
              >
                Use Speech API
              </button>
            )}
            <button onClick={onClearError} className="text-red-300/60 hover:text-red-100" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main overlay panel */}
      <div className="max-w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
        {/* Transport + Back to top row */}
        <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2 p-2 sm:p-3">
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {ttsState.sentences.length > 0 ? (
              <>
                <button
                  onClick={ttsState.isPlaying ? onPause : () => { onScrollToTop(); onPlay(); }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-indigo-500 sm:h-14 sm:w-14"
                  aria-label={ttsState.isPlaying ? 'Pause' : 'Play'}
                >
                  {ttsState.isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
                <button
                  onClick={onStop}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:h-12 sm:w-12"
                  aria-label="Stop"
                >
                  <Square size={18} fill="currentColor" />
                </button>
              </>
            ) : (
              <button
                onClick={() => { onScrollToTop(); onPlay(); }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-indigo-500 sm:h-14 sm:w-14"
                aria-label="Play article"
              >
                <Play size={24} fill="currentColor" className="ml-1" />
              </button>
            )}
            {isScrolled && (
              <button
                onClick={onScrollToTop}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:h-12 sm:w-12"
                aria-label="Back to top"
              >
                <ChevronUp size={20} />
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-[1_1_10rem] items-center gap-2 sm:mx-1">
            {showHubResumeInline && (
              <div
                className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-950/35 px-1.5 py-1"
                role="group"
                aria-label="Resume reading"
              >
                {hubResume.showResumePage && hubResume.last && (
                  <Link
                    href={hubResume.last.path}
                    title={
                      hubResume.last.title
                        ? `Resume investigation — ${hubResume.last.title}`
                        : 'Resume investigation'
                    }
                    className="inline-flex min-w-0 max-w-full items-center rounded-md bg-amber-600 px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-amber-500 sm:max-w-[15rem] sm:text-xs"
                  >
                    <span className="truncate">
                      Resume investigation
                      {hubResume.last.title ? (
                        <span className="font-normal opacity-90"> — {hubResume.last.title}</span>
                      ) : null}
                    </span>
                  </Link>
                )}
                {hubResume.showResumePlayback && hubResume.tts && (
                  <Link
                    href={hubResume.playbackHref}
                    title={
                      hubResume.tts.title && hubResume.tts.path !== hubResume.last?.path
                        ? `Resume playback — ${hubResume.tts.title}`
                        : 'Resume playback'
                    }
                    className="inline-flex min-w-0 max-w-full items-center rounded-md border border-amber-400/35 bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-amber-100 transition-colors hover:bg-white/15 sm:max-w-[13rem] sm:text-xs"
                  >
                    <span className="truncate">
                      Resume playback
                      {hubResume.tts.title && hubResume.tts.path !== hubResume.last?.path ? (
                        <span className="font-normal opacity-90"> — {hubResume.tts.title}</span>
                      ) : null}
                    </span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={hubResume.handleDismiss}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-950/40 text-amber-100/80 ring-1 ring-amber-500/25 transition-colors hover:bg-amber-900/50 hover:text-amber-50"
                  aria-label="Dismiss resume suggestions"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            )}
            {totalSentences > 0 && (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={totalSentences - 1}
                  step={1}
                  value={clamp(displayIndex, 0, totalSentences - 1)}
                  onChange={(e) => setSeekValue(parseInt(e.target.value, 10))}
                  onPointerDown={() => setSeekValue(displayIndex)}
                  onPointerUp={() => {
                    if (seekValue !== null) {
                      onSeekToSentence(seekValue)
                      setSeekValue(null)
                    }
                  }}
                  onTouchEnd={() => {
                    if (seekValue !== null) {
                      onSeekToSentence(seekValue)
                      setSeekValue(null)
                    }
                  }}
                  className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow"
                  aria-label="Seek position in article"
                />
                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  {displayIndex + 1} / {totalSentences}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className={`ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${expanded ? 'bg-indigo-600/30 text-indigo-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            aria-label="TTS settings"
            aria-expanded={expanded}
          >
            <Settings2 size={18} />
          </button>
        </div>

        {/* Settings strip (expandable) */}
        {expanded && (
          <div className="border-t border-slate-700/50 dark:border-slate-800 px-4 py-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/30 rounded-lg px-3 py-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Provider</span>
              <select
                value={ttsState.provider}
                onChange={e => onSetProvider(e.target.value as TTSProvider)}
                className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer"
              >
                <option value="piper" className="bg-slate-900">Piper</option>
                <option value="webSpeech" className="bg-slate-900">Speech API</option>
              </select>
            </div>

            {ttsState.provider === 'piper' ? (
              <>
                <div className="flex items-center gap-1.5 bg-black/30 rounded-lg px-3 py-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Voice</span>
                  <select
                    value={ttsState.piperVoiceId}
                    onChange={e => onSetPiperVoiceId(e.target.value)}
                    className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer max-w-[140px] truncate"
                  >
                    {filteredPiperVoices.length === 0 ? (
                      <option value="" disabled className="bg-slate-900 text-slate-100">No Piper voices available</option>
                    ) : (
                      filteredPiperVoices.map(v => (
                        <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">{getPiperVoiceOptionLabel(v)}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-black/30 rounded-lg px-3 py-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Quote</span>
                  <select
                    value={ttsState.quoteVoiceId}
                    onChange={e => onSetQuoteVoiceId(e.target.value)}
                    className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer max-w-[120px] truncate"
                  >
                    <option value="" className="bg-slate-900 text-slate-100">Narrator</option>
                    {filteredPiperVoices.map(v => (
                      <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">{getPiperVoiceOptionLabel(v)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 w-full min-w-0">
                  <span className="text-slate-400 text-[10px] uppercase font-bold shrink-0">Speakers</span>
                  <input
                    value={ttsState.speakerMapInput}
                    onChange={e => onSetSpeakerMapInput(e.target.value)}
                    placeholder="alice=en_US, bob=en_US"
                    className="bg-transparent text-slate-100 text-xs outline-none placeholder:text-slate-500 flex-1 min-w-0"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 bg-black/30 rounded-lg px-3 py-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Lang</span>
                  <select
                    value={ttsState.langFilter}
                    onChange={e => onSetLangFilter(e.target.value)}
                    className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer"
                  >
                    {['en', 'de', 'fr', 'es', 'ja', 'zh', 'all'].map(l => (
                      <option key={l} value={l} className="bg-slate-900">{l}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => onSetLocalOnly(!ttsState.localOnly)}
                  className={`rounded-lg px-3 py-2 text-[10px] uppercase font-bold transition-colors ${ttsState.localOnly ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/50' : 'bg-black/30 text-slate-400 border border-transparent hover:text-slate-300'}`}
                >
                  Local only
                </button>
                <div className="flex items-center gap-1.5 bg-black/30 rounded-lg px-3 py-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Voice</span>
                  <select
                    value={ttsState.voice?.name ?? ''}
                    onChange={e => {
                      const v = availableVoices.find(v => v.name === e.target.value)
                      if (v) onSetVoice(v)
                    }}
                    className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer max-w-[140px] truncate"
                  >
                    {filteredVoices.map(v => (
                      <option key={v.name} value={v.name} className="bg-slate-900">
                        {v.name.replace('Google ', '')} {v.localService ? '🏠' : '🌐'}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              onClick={() => onSetSubtitleMode(ttsState.subtitleMode === 'caption' ? 'scroll' : 'caption')}
              className={`rounded-lg px-3 py-2 text-[10px] uppercase font-bold transition-colors ${ttsState.subtitleMode === 'scroll' ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/50' : 'bg-black/30 text-slate-400 border border-transparent hover:text-slate-300'}`}
            >
              {ttsState.subtitleMode === 'caption' ? 'Caption' : 'Transcript'}
            </button>

            <div className="flex items-center gap-1.5 bg-black/30 rounded-lg px-3 py-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Speed</span>
              <select
                value={ttsState.rate}
                onChange={e => onSetRate(parseFloat(e.target.value))}
                className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer"
              >
                {RATES.map(r => (
                  <option key={r} value={r} className="bg-slate-900">{r}x</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
