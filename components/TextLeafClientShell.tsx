'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { PtLink } from '@/components/PtLink'
import { usePathname } from 'next/navigation'
import { ArticleNav, ShareLinks, ShareLinksFloating } from '@/components'
import { ArticleTTSProvider } from '@/components/ArticleTTS/ArticleTTSProvider'
import { ArticleTTSOverlay } from '@/components/ArticleTTS/ArticleTTSOverlay'
import { mirrorFilesAssetUrl } from '@/lib/canonicalPublicSite'
import { shouldPersistVisit } from '@/lib/visitResumeStorage'
import { useMobileHubTtsChrome } from '@/lib/hooks/useMobileHubTtsChrome'
import { useSiteAiPageContextRegistration } from '@/components/SiteAi/SiteAiProvider'

export interface TextLeafClientShellProps {
  articlePath: string
  title: string
  body: string
}

/** Split plain text into blocks for `<p>` nodes: blank-line paragraphs, else non-empty lines. */
function splitPlainTextIntoDisplayParagraphs (raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n')
  const chunks = normalized.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  if (chunks.length >= 2) return chunks
  const lines = normalized.split(/\n/).map((s) => s.trim()).filter(Boolean)
  return lines.length > 0 ? lines : (normalized.trim() ? [normalized.trim()] : [''])
}

/**
 * Readable view for repo .txt leaves and Relay hook sources (.cs).
 * Pretty site URL mirrors the article path; raw bytes use the public files asset URL.
 */
export function TextLeafClientShell ({ articlePath, title, body }: TextLeafClientShellProps) {
  const pathname = usePathname() || ''
  const [isScrolled, setIsScrolled] = useState(false)
  const { suppressOverlay } = useMobileHubTtsChrome()

  const shareUrl = articlePath ? `/${articlePath}` : '/'
  const rawUrl = mirrorFilesAssetUrl(articlePath)
  const basePath = useMemo(
    () => (articlePath.includes('/') ? articlePath.split('/').slice(0, -1).join('/') : ''),
    [articlePath],
  )
  const paragraphs = useMemo(() => splitPlainTextIntoDisplayParagraphs(body), [body])

  const persistVisit = useMemo(
    () =>
      pathname && shouldPersistVisit(pathname) ? { pathname, title } : null,
    [pathname, title],
  )

  useSiteAiPageContextRegistration(useMemo(
    () => ({
      path: articlePath,
      title,
      excerpt: body.slice(0, 800),
    }),
    [articlePath, title, body],
  ))

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event('dynamic-index-update'))
    }, 200)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <ArticleTTSProvider
      articleTitle={title}
      articleContent={body}
      basePath={basePath}
      persistVisit={persistVisit}
    >
      {({
        onPlayFromSentence,
        currentSentenceIndex,
        sentences,
        onClearError,
        ttsState,
        availableVoices,
        availablePiperVoices,
        onPlay,
        onPause,
        onStop,
        setVoice,
        setRate,
        setProvider,
        setPiperVoiceId,
        setPiperLang,
        setQuoteVoiceId,
        setSpeakerMapInput,
        setLangFilter,
        setLocalOnly,
        setSubtitleMode,
        switchToSpeechAndResume,
        retry,
      }) => {
        const scrollToTop = () => window.scroll({ top: 0, left: 0, behavior: 'smooth' })

        return (
          <div className="relative space-y-12">
            <article className="prose prose-slate max-w-none dark:prose-invert">
              <div className="not-prose mb-6">
                <ShareLinksFloating url={shareUrl} title={title} mdSource={body} />
              </div>
              <h1 className="not-prose mb-4 border-b border-slate-200 pb-4 text-4xl font-extrabold capitalize tracking-tight text-slate-900 dark:border-slate-800 dark:text-white">
                {title}
              </h1>
              <p className="not-prose mb-6 text-sm text-slate-600 dark:text-slate-400">
                <span className="break-all font-mono text-xs">{articlePath}</span>
                {' · '}
                <PtLink
                  href={rawUrl}
                  className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
                >
                  Open raw (text/plain)
                </PtLink>
              </p>
              <div className="txt-plain-content not-prose space-y-4 text-slate-900 dark:text-slate-100">
                {paragraphs.map((para, i) => (
                  <p key={i} className="txt-para m-0 whitespace-pre-line text-base leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
              <div className="not-prose mt-10">
                <ShareLinks url={shareUrl} title={title} mdSource={body} />
              </div>
              <ArticleNav />
            </article>
            {!suppressOverlay && (
              <ArticleTTSOverlay
                ttsState={ttsState}
                availableVoices={availableVoices}
                availablePiperVoices={availablePiperVoices}
                onPlay={onPlay}
                onPause={onPause}
                onStop={onStop}
                onClearError={onClearError}
                onSeekToSentence={onPlayFromSentence}
                sentences={sentences}
                currentSentenceIndex={currentSentenceIndex}
                onRetry={retry}
                onSetVoice={setVoice}
                onSetRate={setRate}
                onSetProvider={setProvider}
                onSetPiperVoiceId={setPiperVoiceId}
                onSetPiperLang={setPiperLang}
                onSetQuoteVoiceId={setQuoteVoiceId}
                onSetSpeakerMapInput={setSpeakerMapInput}
                onSetLangFilter={setLangFilter}
                onSetLocalOnly={setLocalOnly}
                onSetSubtitleMode={setSubtitleMode}
                onSwitchToSpeechAndResume={switchToSpeechAndResume}
                onScrollToTop={scrollToTop}
                isScrolled={isScrolled}
              />
            )}
          </div>
        )
      }}
    </ArticleTTSProvider>
  )
}
