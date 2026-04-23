'use client'

import React, { useRef, useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { ArticleTTSProvider } from '@/components/ArticleTTS/ArticleTTSProvider'
import { ArticleTTSOverlay } from '@/components/ArticleTTS/ArticleTTSOverlay'
import { stripMarkdownForTTS, buildParagraphStarts } from '@/components/Timeline/ttsHelpers'
import { ArticleNav, ShareLinks, ShareLinksFloating } from '@/components'
import type { ShareExtractResult } from '@/lib/share'
import { shouldPersistVisit } from '@/lib/visitResumeStorage'
import { useMobileHubTtsChrome } from '@/lib/hooks/useMobileHubTtsChrome'

export interface ArticleClientShellProps {
  articleTitle: string
  articleContent: string
  basePath: string
  articlePath?: string
  /** @deprecated superseded by mdSource + shareExtract */
  articleDescription?: string
  articleFrontmatter?: Record<string, unknown>
  ogImageUrl?: string
  shareExtract?: ShareExtractResult
  children: React.ReactNode
}

export function ArticleClientShell ({
  articleTitle,
  articleContent,
  basePath,
  articlePath,
  articleDescription,
  articleFrontmatter,
  ogImageUrl,
  shareExtract,
  children
}: ArticleClientShellProps) {
  const pathname = usePathname() || ''
  const articleRef = useRef<HTMLElement>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const { suppressOverlay } = useMobileHubTtsChrome()
  const persistVisit = useMemo(
    () =>
      pathname && shouldPersistVisit(pathname) ? { pathname, title: articleTitle } : null,
    [pathname, articleTitle]
  )

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <ArticleTTSProvider
      articleTitle={articleTitle}
      articleContent={articleContent}
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
        retry
      }) => {
        const scrollToTop = () => window.scroll({ top: 0, left: 0, behavior: 'smooth' })
        const handleArticleDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
          if (sentences.length === 0) return
          const target = e.target as Node
          const container = articleRef.current
          if (!container) return
          const mdx = container.querySelector('.mdx-content')
          if (!mdx?.contains(target)) return
          const block = (target as Element).closest?.('p, h2, h3, h4, blockquote, li')
          if (!block) return
          const blocks = container.querySelectorAll('.mdx-content p, .mdx-content h2, .mdx-content h3, .mdx-content h4, .mdx-content blockquote, .mdx-content li')
          const paraIdx = Array.from(blocks).indexOf(block as Element)
          if (paraIdx < 0) return
          const text = stripMarkdownForTTS(articleContent, articleTitle)
          const starts = buildParagraphStarts(text)
          const sentenceIndex = starts[paraIdx] ?? 0
          onPlayFromSentence(sentenceIndex)
        }

        return (
          <div className="space-y-12 relative">
            <article
              ref={articleRef}
              className="prose prose-slate dark:prose-invert max-w-none"
              onDoubleClick={sentences.length > 0 ? handleArticleDoubleClick : undefined}
            >
              {articlePath ? (
                <div className="not-prose mb-6">
                  <ShareLinksFloating
                    url={`/${articlePath}`}
                    title={articleTitle}
                    description={articleDescription}
                    mdSource={articleContent}
                    frontmatter={articleFrontmatter}
                    shareExtract={shareExtract}
                    ogImageUrl={ogImageUrl}
                  />
                </div>
              ) : null}
              {children}
              {articlePath && (
                <ShareLinks
                  url={`/${articlePath}`}
                  title={articleTitle}
                  description={articleDescription}
                  mdSource={articleContent}
                  frontmatter={articleFrontmatter}
                  shareExtract={shareExtract}
                  ogImageUrl={ogImageUrl}
                />
              )}
            </article>
            <ArticleNav />
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
