'use client'

import React, { useState, useEffect, useMemo, memo, useRef, useSyncExternalStore } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { RelayMarkdown } from '@/components/RelayMarkdown'
import { PopImage, useFiles, ArticleNav } from '@/components'
import { ArticleRemote404Notice } from '@/components/ArticleRemote404Notice'
import Link from 'next/link'
import { prepareArticleMarkdown, extractFirstHeading } from '@/lib/articleBody'
import { ArticleTTSProvider } from '@/components/ArticleTTS/ArticleTTSProvider'
import { ArticleTTSOverlay } from '@/components/ArticleTTS/ArticleTTSOverlay'
import { stripMarkdownForTTS, buildParagraphStarts } from '@/components/Timeline/ttsHelpers'
import { SuspenseLoader } from '@client'
import { formatIndexDateTiny } from '@/lib/indexUpdated'
import { shouldPersistVisit } from '@/lib/visitResumeStorage'
import { ShareLinks, ShareLinksFloating, TextLeafClientShell } from '@/components'
import { useMobileHubTtsChrome } from '@/lib/hooks/useMobileHubTtsChrome'
import { resolveOgImageUrl } from '@/lib/share/resolveOgImageUrl'
import { remoteRelay } from '@/lib/remoteRelayStore'
import { publicFilesAssetUrl } from '@/lib/canonicalPublicSite'

const DIRECT_IMAGE_EXT = /\.(jpg|jpeg|png|gif|svg|webp|avif|ico)$/i
const DIRECT_PLAINTEXT_LEAF_EXT = /\.(txt|cs)$/i

type DirectImageLeaf = {
  basePath: string
  fileName: string
  intrinsicWidth?: number
  intrinsicHeight?: number
  displayTitle: string
}

type DirectTextLeaf = {
  displayTitle: string
  body: string
}

export const CatchAllClient = memo(function CatchAllClient() {
  const params = useParams()
  const pathname = usePathname()
  const { suppressOverlay } = useMobileHubTtsChrome()
  const { fileList, loading: indexLoading, error: filesIndexError } = useFiles()
  const filesBaseUrl = useSyncExternalStore(
    (cb) => remoteRelay.subscribe(cb),
    () => remoteRelay.getSnapshot().filesBaseUrl,
    () => remoteRelay.getSnapshot().filesBaseUrl,
  )
  const [content, setContent] = useState<string | null>(null)
  const [articleMeta, setArticleMeta] = useState<{
    ogImageUrl?: string
  } | null>(null)
  const [basePath, setBasePath] = useState('')
  const [articleTitle, setArticleTitle] = useState('')
  const [unusedImages, setUnusedImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filesIndex, setFilesIndex] = useState<any>(null)
  const [directFiles, setDirectFiles] = useState<string[]>([])
  const [subDirs, setSubDirs] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [mds, setMds] = useState<string[]>([])
  const [mdContents, setMdContents] = useState<Record<string, { title: string; content: string }>>({})
  const [error, setError] = useState<string | null>(null)
  const [remoteArticle404, setRemoteArticle404] = useState(false)
  /** True when 404 is shown and the URL path does not appear in index.json (vs indexed .txt CDN miss, etc.). */
  const [article404PathMissingFromIndex, setArticle404PathMissingFromIndex] = useState(false)
  const [articleRetryKey, setArticleRetryKey] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [directImageLeaf, setDirectImageLeaf] = useState<DirectImageLeaf | null>(null)
  const [directTextLeaf, setDirectTextLeaf] = useState<DirectTextLeaf | null>(null)

  const slugArray = useMemo(() => {
    if (!params.slug) return []
    return Array.isArray(params.slug) ? params.slug : [params.slug]
  }, [params.slug])

  const path = useMemo(() => slugArray.join('/'), [slugArray])
  const persistVisitForArticle = useMemo(
    () =>
      content && pathname && shouldPersistVisit(pathname)
        ? { pathname, title: articleTitle }
        : null,
    [content, pathname, articleTitle]
  )

  const ogImageUrlForShare = useMemo(() => {
    if (articleMeta?.ogImageUrl) return articleMeta.ogImageUrl
    if (!content || !articleMeta) return undefined
    return resolveOgImageUrl(content, basePath)
  }, [content, basePath, articleMeta])

  /** Index / generated listing pages (no article MDX) — same label as the page title (h1). */
  const listingPageTitle = useMemo(() => path.split('/').pop() || 'Home', [path])
  const loadingPathRef = useRef<string | null>(null)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (indexLoading) return

    const tree = fileList
    setFilesIndex(tree ?? null)

    const baseUrl = filesBaseUrl
    const version = typeof tree?._version === 'string' ? tree._version : ''
    const vParam = version ? `?v=${version}` : ''

    const requestPath = path
    loadingPathRef.current = requestPath
    let isMounted = true
    const abortController = new AbortController()

    const loadPage = async () => {
      try {
        setLoading(true)
        setRemoteArticle404(false)
        setArticle404PathMissingFromIndex(false)
        setError(null)
        setDirectImageLeaf(null)
        setDirectTextLeaf(null)

        let articleLoaded = false
        let articleFetchStatus: number | null = null
        try {
          const articleRes = await remoteRelay.fetchFilesMd(requestPath, vParam, abortController.signal)
          articleFetchStatus = articleRes.status
          if (loadingPathRef.current !== requestPath || !isMounted) return

          if (articleRes.ok) {
            const text = await articleRes.text()
            const mdxSource = prepareArticleMarkdown(text)
            const lastSeg = requestPath.split('/').pop() || ''
            const calcBasePath = /\.mdx?$/i.test(lastSeg)
              ? requestPath.split('/').slice(0, -1).join('/')
              : requestPath
            const failTitle =
              extractFirstHeading(mdxSource) ||
              lastSeg.replace(/\.mdx?$/i, '').replace(/_/g, ' ') ||
              'Article'
            const apiOg = resolveOgImageUrl(mdxSource, calcBasePath)

            if (isMounted && loadingPathRef.current === requestPath) {
              setRemoteArticle404(false)
              setArticle404PathMissingFromIndex(false)
              setDirectImageLeaf(null)
              setDirectTextLeaf(null)
              setBasePath(calcBasePath || '')
              setContent(mdxSource)
              setArticleMeta({ ogImageUrl: apiOg })
              setArticleTitle(failTitle)
              setDirectFiles([])
              setSubDirs([])
              setImages([])
              setMds([])
            }

            let current = tree
            for (const s of (calcBasePath || '').split('/').filter(Boolean)) {
              if (current && current[s]) current = current[s]
              else { current = null; break }
            }

            if (current && typeof current === 'object') {
              const imagesInDir = Object.keys(current).filter(k => {
                if (k === '_count') return false
                const val = current[k]
                const isFile = val !== null && typeof val === 'object' && !('_count' in val)
                return isFile && /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(k)
              })
              const unused = imagesInDir.filter((img: string) => {
                const escapedImg = img.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const regex = new RegExp(`[\\(/\\s"'.]${escapedImg}([\\?\\s"')]|$)`, 'i')
                return !regex.test(mdxSource)
              })
              if (isMounted && loadingPathRef.current === requestPath) setUnusedImages(unused)
            }
            articleLoaded = true
          }
        } catch {
          /* fall through to index / 404 handling */
        }

        if (articleLoaded) {
          /* article path handled */
        } else {
          let current = tree
          if (current && typeof current === 'object') {
            for (const s of slugArray) {
              if (current && typeof current === 'object' && current[s]) current = current[s]
              else { current = null; break }
            }
          } else {
            current = null
          }

          const pathMissingFromIndex = current === null

          const lastSeg = slugArray.length ? slugArray[slugArray.length - 1] : ''
          const looksLikeRasterImage = DIRECT_IMAGE_EXT.test(lastSeg)
          const isImageFileLeaf =
            current &&
            typeof current === 'object' &&
            !('_count' in current) &&
            looksLikeRasterImage

          if (isImageFileLeaf) {
            const parentParts = slugArray.slice(0, -1)
            const calcBasePath = parentParts.join('/')
            const meta = current as Record<string, unknown>
            const titled =
              typeof meta._title === 'string' && meta._title.trim()
                ? meta._title.trim()
                : lastSeg.replace(/_/g, ' ').replace(/\.[^.]+$/, '')
            if (isMounted && loadingPathRef.current === requestPath) {
              setRemoteArticle404(false)
              setArticle404PathMissingFromIndex(false)
              setContent(null)
              setArticleMeta(null)
              setArticleTitle(titled)
              setDirectFiles([])
              setSubDirs([])
              setImages([])
              setMds([])
              setMdContents({})
              setDirectImageLeaf({
                basePath: calcBasePath,
                fileName: lastSeg,
                intrinsicWidth: typeof meta._width === 'number' ? meta._width : undefined,
                intrinsicHeight: typeof meta._height === 'number' ? meta._height : undefined,
                displayTitle: titled,
              })
              setDirectTextLeaf(null)
            }
          } else if (
            current &&
            typeof current === 'object' &&
            !('_count' in current) &&
            DIRECT_PLAINTEXT_LEAF_EXT.test(lastSeg)
          ) {
            const meta = current as Record<string, unknown>
            const titled =
              typeof meta._title === 'string' && meta._title.trim()
                ? meta._title.trim()
                : lastSeg.replace(/_/g, ' ').replace(/\.(txt|cs)$/i, '')
            try {
              const response = await remoteRelay.fetchFilesMd(requestPath, vParam, abortController.signal)
              if (!response.ok) throw new Error('txt_fetch_failed')
              const body = await response.text()
              if (isMounted && loadingPathRef.current === requestPath) {
                setRemoteArticle404(false)
                setArticle404PathMissingFromIndex(false)
                setContent(null)
                setArticleMeta(null)
                setArticleTitle(titled)
                setDirectFiles([])
                setSubDirs([])
                setImages([])
                setMds([])
                setMdContents({})
                setDirectImageLeaf(null)
                setDirectTextLeaf({ displayTitle: titled, body })
              }
            } catch {
              if (isMounted && loadingPathRef.current === requestPath) {
                setDirectTextLeaf(null)
                setDirectImageLeaf(null)
                setContent(null)
                setArticleMeta(null)
                setArticleTitle('')
                setDirectFiles([])
                setSubDirs([])
                setImages([])
                setMds([])
                setMdContents({})
                setRemoteArticle404(true)
                setArticle404PathMissingFromIndex(false)
              }
            }
          } else if (current && typeof current === 'object' && '_count' in current) {
            const dirs: string[] = []
            const files: string[] = []

            Object.keys(current).forEach(key => {
              if (key === '_count' || key.startsWith('_')) return
              const val = current[key]
              const isFile = val !== null && typeof val === 'object' && !('_count' in val)
              if (isFile) {
                files.push(key)
              } else {
                dirs.push(key)
              }
            })

            if (isMounted && loadingPathRef.current === requestPath) {
              setRemoteArticle404(false)
              setArticle404PathMissingFromIndex(false)
              setDirectImageLeaf(null)
              setDirectTextLeaf(null)
              setContent(null)
              setArticleMeta(null)
              setArticleTitle('')
              setDirectFiles(files.sort())
              setSubDirs(dirs.sort())

              const imgFiles = files.filter((f: string) => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(f))
              const mdFiles = files.filter((f: string) => f.endsWith('.md') && f !== 'page.md' && !f.endsWith('.auto.md'))
              const plainLeafFiles = files.filter((f: string) => DIRECT_PLAINTEXT_LEAF_EXT.test(f))
              setImages(imgFiles)
              setMds([...mdFiles, ...plainLeafFiles].sort((a, b) => -a.localeCompare(b)))

              const contents: Record<string, { title: string; content: string }> = {}

              mdFiles.forEach(f => {
                const fileData = current[f]
                if (fileData?._title) {
                  contents[f] = { title: fileData._title, content: '' }
                }
              })

              await Promise.all(mdFiles.map(async (f) => {
                if (!isMounted || loadingPathRef.current !== requestPath) return
                const fullPath = path ? `${path}/${f}` : f
                try {
                  const response = await remoteRelay.fetchFilesMd(fullPath, vParam, abortController.signal)
                  const text = await response.text()
                  const mdxSource = prepareArticleMarkdown(text)
                  const h1 = extractFirstHeading(mdxSource)
                  contents[f] = {
                    title: h1 || contents[f]?.title || f.replace(/_/g, ' ').replace('.md', ''),
                    content: mdxSource,
                  }
                } catch (e) { }
              }))
              if (isMounted && loadingPathRef.current === requestPath) setMdContents(contents)
            }
          } else if (isMounted && loadingPathRef.current === requestPath) {
            setDirectImageLeaf(null)
            setDirectTextLeaf(null)
            setContent(null)
            setArticleMeta(null)
            setArticleTitle('')
            setDirectFiles([])
            setSubDirs([])
            setImages([])
            setMds([])
            setMdContents({})
            if (articleFetchStatus === 404) {
              setRemoteArticle404(true)
              setArticle404PathMissingFromIndex(pathMissingFromIndex)
            } else {
              setRemoteArticle404(false)
              setArticle404PathMissingFromIndex(false)
              setError('Could not load this page.')
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError' && isMounted && loadingPathRef.current === requestPath) {
          setError(String(e))
          setRemoteArticle404(false)
          setArticle404PathMissingFromIndex(false)
        }
      } finally {
        if (loadingPathRef.current === requestPath) setLoading(false)
      }
    }

    loadPage()
    return () => {
      isMounted = false
      loadingPathRef.current = null
      abortController.abort()
    }
  }, [path, pathname, slugArray, fileList, indexLoading, articleRetryKey, filesBaseUrl])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    queueMicrotask(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (indexLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><SuspenseLoader /></div>
  }


  if (directImageLeaf) {
    const listingShareUrl = path ? `/${path}` : '/'
    const ogForImage = publicFilesAssetUrl(path)
    return (
      <div className="space-y-12">
        <div className="not-prose mb-6">
          <ShareLinksFloating
            url={listingShareUrl}
            title={directImageLeaf.displayTitle}
            mdSource=""
            ogImageUrl={ogForImage}
          />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold mb-8 capitalize tracking-tight text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4">
            {directImageLeaf.displayTitle}
          </h1>
          <div className="flex justify-center py-4">
            <PopImage
              src={directImageLeaf.fileName}
              basePath={directImageLeaf.basePath}
              intrinsicWidth={directImageLeaf.intrinsicWidth}
              intrinsicHeight={directImageLeaf.intrinsicHeight}
              w={1600}
              className="max-w-full h-auto rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
              alt={directImageLeaf.displayTitle}
            />
          </div>
          <ShareLinks
            url={listingShareUrl}
            title={directImageLeaf.displayTitle}
            mdSource=""
            ogImageUrl={ogForImage}
          />
        </div>
      </div>
    )
  }

  if (directTextLeaf) {
    return (
      <TextLeafClientShell
        articlePath={path}
        title={directTextLeaf.displayTitle}
        body={directTextLeaf.body}
      />
    )
  }

  if (content) {
    return (
      <ArticleTTSProvider
        articleTitle={articleTitle}
        articleContent={content}
        basePath={basePath}
        persistVisit={persistVisitForArticle}
      >
        {({ onPlay, onPause, onStop, onPlayFromSentence, currentSentenceIndex, sentences, onClearError, ttsState, availableVoices, availablePiperVoices, setVoice, setRate, setProvider, setPiperVoiceId, setPiperLang, setQuoteVoiceId, setSpeakerMapInput, setLangFilter, setLocalOnly, setSubtitleMode, switchToSpeechAndResume, retry }) => {
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
            const text = stripMarkdownForTTS(content, articleTitle)
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
                {path ? (
                  <div className="not-prose mb-6">
                    <ShareLinksFloating
                      url={`/${path}`}
                      title={articleTitle}
                      mdSource={content || ''}
                      ogImageUrl={ogImageUrlForShare}
                    />
                  </div>
                ) : null}
                {content ? (
                  <RelayMarkdown key={path ?? ''} content={content} basePath={basePath} sourcePath={path || undefined} />
                ) : (
                  <div className="animate-pulse h-32 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl" />
                )}
                {path ? (
                  <ShareLinks
                    url={`/${path}`}
                    title={articleTitle}
                    mdSource={content || ''}
                    ogImageUrl={ogImageUrlForShare}
                  />
                ) : null}
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

              {unusedImages.length > 0 && (
                <div className="space-y-8 pt-12 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-purple-500 rounded-full" />
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Gallery</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {unusedImages.map(img => {
                      let curr: any = filesIndex
                      const baseParts = basePath.split('/').filter(Boolean)
                      for (const p of baseParts) {
                        if (curr) curr = curr[p]
                      }
                      const imgNode = curr?.[img]
                      const intrinsicWidth = imgNode?._width
                      const intrinsicHeight = imgNode?._height

                      return (
                        <div key={img} className="group aspect-square relative transition-transform duration-300 hover:-translate-y-1">
                          <PopImage
                            src={img}
                            basePath={basePath}
                            intrinsicWidth={intrinsicWidth}
                            intrinsicHeight={intrinsicHeight}
                            w={400}
                            className="w-full h-full object-cover rounded-xl shadow-sm border border-slate-100 dark:border-slate-900"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        }}
      </ArticleTTSProvider>
    )
  }

  const listingShareUrl = path ? `/${path}` : '/'

  return (
    <div className="space-y-12">
      <div className="not-prose mb-6">
        <ShareLinksFloating
          url={listingShareUrl}
          title={listingPageTitle}
          mdSource=""
        />
      </div>
      <div>
        <h1 className="text-4xl font-extrabold mb-8 capitalize tracking-tight text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4">
          {listingPageTitle}
        </h1>

        {directFiles.length === 0 && subDirs.length === 0 ? (
          filesIndexError && !fileList ? null : remoteArticle404 ? (
            <ArticleRemote404Notice
              notInIndex={article404PathMissingFromIndex}
              path={path}
              onRetry={() => setArticleRetryKey((k) => k + 1)}
            />
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-500 mb-4">No content found for this path</p>
              {error && <p className="text-xs text-red-500 font-mono">{error}</p>}
              <Link href="/" className="text-blue-500 hover:underline">
                Back to Home
              </Link>
            </div>
          )
        ) : (
          <>
            {subDirs.length > 0 && (
              <div className="space-y-6 mb-16">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-blue-500 rounded-full" />
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">Categories</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subDirs.map(dir => {
                    let current = filesIndex
                    for (const s of slugArray) if (current) current = current[s]
                    const node = current?.[dir]
                    const count = node?._count || 0
                    const title = node?._title

                    return (
                      <Link
                        key={dir}
                        href={`/${path ? `${path}/${dir}` : dir}`}
                        className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {count} files
                          </span>
                        </div>
                        <div className="flex flex-col">
                          {title && (
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                              {title}
                            </span>
                          )}
                          <span className="text-lg font-bold text-slate-900 dark:text-white capitalize group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {dir.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {mds.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-emerald-500 rounded-full" />
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">Documents</h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {mds.map(file => {
                    let cur = filesIndex
                    for (const s of slugArray) {
                      if (cur) cur = cur[s]
                    }
                    const fileNode = cur?.[file]
                    const updatedTiny = formatIndexDateTiny(fileNode?._updated)
                    const docTitle = DIRECT_PLAINTEXT_LEAF_EXT.test(file)
                      ? (typeof fileNode?._title === 'string' && fileNode._title.trim()
                        ? fileNode._title.trim()
                        : file.replace(/_/g, ' ').replace(/\.(txt|cs)$/i, ''))
                      : (mdContents[file]?.title || file.replace(/_/g, ' ').replace(/\.md$/, ''))
                    return (
                      <Link
                        key={file}
                        href={`/${path ? `${path}/${file}` : file}`}
                        className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mb-1">
                              {file}
                            </span>
                            <span className="text-xl group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {docTitle}
                            </span>
                            {updatedTiny ? (
                              <span className="mt-1 text-[10px] font-normal tabular-nums text-slate-500 dark:text-slate-400">
                                {updatedTiny}
                              </span>
                            ) : null}
                          </div>
                          <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div className="mt-16 space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-amber-500 rounded-full" />
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">Media</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {images.map(img => {
                    let current = filesIndex
                    for (const s of slugArray) if (current) current = current[s]
                    const imgMeta = current?.[img]
                    const imgTitle = imgMeta?._title
                    const imgDateTiny = formatIndexDateTiny(imgMeta?._updated)

                    return (
                      <div key={img} className="flex flex-col gap-2">
                        <div className="aspect-square relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:-translate-y-1">
                          <PopImage
                            src={img}
                            basePath={path}
                            w={200}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="px-1 min-w-0">
                          {imgTitle && (
                            <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate">
                              {imgTitle}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 truncate">
                            {img}
                          </div>
                          {imgDateTiny ? (
                            <div className="truncate text-[9px] tabular-nums text-slate-500 dark:text-slate-400">
                              {imgDateTiny}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <ShareLinks
          url={listingShareUrl}
          title={listingPageTitle}
          mdSource=""
        />
      </div>
    </div>
  )
})
