'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Play, Pause, Square, ChevronUp, Settings2, X } from 'lucide-react'
import type { TTSState, SubtitleMode, PiperVoice, TTSProvider } from '@/lib/hooks/useTTS'
import { useBottomChrome } from '@/lib/BottomChromeContext'

const RATES = [0.75, 1.0, 1.25, 1.5, 2.0]

/** Range styling: larger thumb/track for touch; used with onInput + onChange for live preview while dragging. */
const seekRangeClassName =
  'h-4 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-indigo-500 ' +
  '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10 ' +
  '[&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:cursor-pointer ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 ' +
  '[&::-webkit-slider-thumb]:shadow-md ' +
  '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/10 ' +
  '[&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-indigo-500'

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
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const activeTranscriptLineRef = useRef<HTMLParagraphElement>(null)
  const { isHub, setTtsDockHeightPx } = useBottomChrome()
  const [expanded, setExpanded] = useState(false)
  const [seekValue, setSeekValue] = useState<number | null>(null)

  const onSeekSliderMove = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setSeekValue(parseInt(e.currentTarget.value, 10))
  }

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
  const displaySentenceIdx = clamp(displayIndex, 0, Math.max(0, totalSentences - 1))

  /** Keep the active line visible inside the transcript panel only (no document scroll). */
  useEffect(() => {
    if (ttsState.subtitleMode !== 'scroll' || totalSentences === 0) return
    const container = transcriptScrollRef.current
    const el = activeTranscriptLineRef.current
    if (!container || !el) return
    const cr = container.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    const elTopRelative = er.top - cr.top + container.scrollTop
    const nextTop = elTopRelative - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' })
  }, [displaySentenceIdx, ttsState.subtitleMode, totalSentences])

  const filteredVoices = availableVoices
    .filter(v => ttsState.langFilter === 'all' || v.lang.startsWith(ttsState.langFilter))
    .filter(v => !ttsState.localOnly || v.localService)

  const filteredPiperVoices = availablePiperVoices

  /** Panel width: seek needs a wide bar; expanded settings need room below — but the top transport row only stretches when the seek slider is present. */
  const panelNeedsFullWidth = totalSentences > 0 || expanded
  const transportRowNeedsFullWidth = totalSentences > 0
  /** With sentences, the seek uses flex-1 on the same row as buttons — when settings are open that reads as a hollow gap; move seek to a second row. */
  const seekOnOwnRow = expanded && totalSentences > 0
  /** Before first play, `sentences` is still empty but the panel is wide when expanded — pin the transport cluster to the trailing edge. */
  const transportClusterEnd = seekOnOwnRow || (expanded && totalSentences === 0)
  const transportRowFullWidth = seekOnOwnRow || transportRowNeedsFullWidth || (expanded && totalSentences === 0)

  const transcriptWidthClass = panelNeedsFullWidth
    ? 'min-w-0 w-full max-w-full'
    : 'mx-auto box-content w-fit max-w-[min(100%,100vw-0.5rem)] lg:mx-0'

  return (
    <div
      ref={rootRef}
      className={`fixed bottom-0 z-50 flex flex-col gap-1.5 box-border max-w-[100vw] px-1 sm:px-0 lg:bottom-8 lg:px-0 ${panelNeedsFullWidth
        ? 'left-0 right-0 w-full lg:left-auto lg:right-8 lg:w-full lg:max-w-md'
        : 'left-0 right-0 w-full lg:left-auto lg:right-8 lg:w-max lg:max-w-full'
        }`}
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

      {totalSentences > 0 && (
        <div className={transcriptWidthClass}>
          <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/95 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
            {ttsState.subtitleMode === 'caption' ? (
              <div className="max-h-[min(28vh,14rem)] overflow-y-auto px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-sm sm:text-base leading-relaxed text-slate-100">
                  {sentences[displaySentenceIdx] ?? ''}
                </p>
              </div>
            ) : (
              <div
                ref={transcriptScrollRef}
                className="max-h-[min(28vh,14rem)] overflow-y-auto px-3 py-2 sm:px-4 sm:py-2.5 scroll-smooth"
              >
                {sentences.map((s, i) => (
                  <p
                    key={i}
                    ref={i === displaySentenceIdx ? activeTranscriptLineRef : undefined}
                    className={`text-sm sm:text-base leading-relaxed mb-1.5 last:mb-0 transition-colors duration-200 ${i === displaySentenceIdx
                      ? 'text-white font-semibold'
                      : i < displaySentenceIdx
                        ? 'text-slate-500'
                        : 'text-slate-400'
                      }`}
                  >
                    {s}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main overlay panel — full width only when seek needs room; otherwise hug controls */}
      <div
        className={`overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 ${transcriptWidthClass}`}
      >
        {/* Transport + seek: inline seek only when settings collapsed; when expanded, seek on its own row so flex-1 does not hollow the row. */}
        <div
          className={`min-w-0 p-2 sm:p-3 ${seekOnOwnRow ? 'flex w-full flex-col gap-2' : ''} ${!transportRowFullWidth && panelNeedsFullWidth ? 'text-right' : ''}`}
        >
          <div
            className={`min-w-0 flex-wrap items-center gap-1.5 sm:gap-2 ${transportRowFullWidth ? 'flex w-full' : 'inline-flex max-w-full'} ${transportClusterEnd ? 'justify-end' : ''}`}
          >
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {ttsState.sentences.length > 0 ? (
                <>
                  <button
                    onClick={ttsState.isPlaying ? onPause : () => { onPlay(); }}
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
                  onClick={() => { onPlay(); }}
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

            {totalSentences > 0 && !seekOnOwnRow && (
              <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={totalSentences - 1}
                  step={1}
                  value={clamp(displayIndex, 0, totalSentences - 1)}
                  onChange={onSeekSliderMove}
                  onInput={onSeekSliderMove}
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
                  className={seekRangeClassName}
                  aria-label="Seek position in article"
                />
                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  {displayIndex + 1} / {totalSentences}
                </span>
              </div>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${expanded ? 'bg-indigo-600/30 text-indigo-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              aria-label="TTS settings"
              aria-expanded={expanded}
            >
              <Settings2 size={18} />
            </button>
          </div>
          {seekOnOwnRow && (
            <div className="flex min-h-[44px] min-w-0 w-full items-center gap-2 px-0">
              <input
                type="range"
                min={0}
                max={totalSentences - 1}
                step={1}
                value={clamp(displayIndex, 0, totalSentences - 1)}
                onChange={onSeekSliderMove}
                onInput={onSeekSliderMove}
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
                className={seekRangeClassName}
                aria-label="Seek position in article"
              />
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                {displayIndex + 1} / {totalSentences}
              </span>
            </div>
          )}
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
