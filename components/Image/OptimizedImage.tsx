'use client'

import {
    PORTRAIT_MEDIA_QUERY,
    checkFileExists,
    processImageProps,
} from '@/components/helpers/imageHelper'
import { useFiles } from '@/components/FilesContext'
import { catalogLeafAtPath } from '@/lib/catalogLeafAtPath'
import {
    LOAD_TIMEOUT_MS,
    isPlaceholderSrc,
    loadTimerAction,
    nextLoadAttempt,
    rasterLoadSucceeded,
    retryLoadState,
} from '@/components/Image/imageLoadFailover'
import React, { useState, useEffect, useRef } from 'react'

interface OptimizedImageProps {
    children?: React.ReactNode
    className?: string

    [key: string]: any
}

/** DOM-safe subset of props to pass to <img> (exclude custom/React-only props). */
const IMG_ATTRS = new Set([
    'src',
    'alt',
    'width',
    'height',
    'loading',
    'title',
    'style',
    'referrerPolicy',
    'sizes',
    'crossOrigin',
    'decoding',
    'fetchPriority',
])

export default function OptimizedImage({ children, className, ...props }: OptimizedImageProps) {
    const srcProps: OptimizedImageProps = processImageProps({ ...props, className }, props.basePath)
    const { fileList } = useFiles()
    const [isVisible, setIsVisible] = useState(() => Boolean(props.priority))
    const [mirrorIndex, setMirrorIndex] = useState(0)
    /** Full-size decode finished — hide Relay LQIP underlay */
    const [lqipDismissed, setLqipDismissed] = useState(false)
    /** QUERY fallback only while files catalog is still loading. */
    const [asyncPortraitOk, setAsyncPortraitOk] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)
    /** Drop portrait <source> for this attempt after portrait/landscape timeout or error. */
    const [portraitDisabled, setPortraitDisabled] = useState(false)
    const [attempt, setAttempt] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const {
        alt,
        priority,
        blurDataURL,
        optimizedSrc,
        lqipOptimizedSrc,
        highResSrc,
        mirrorSrcs,
        portraitOptimizedSrc,
        portraitMirrorSrcs,
        portraitMedia,
        portraitRepoRel,
        basePath,
        className: processedClassName,
        ...rest
    } = srcProps
    const finalProps: Record<string, unknown> = {}
    Object.keys(rest).forEach((key) => {
        if (IMG_ATTRS.has(key)) finalProps[key] = (rest as Record<string, unknown>)[key]
    })

    useEffect(() => {
        if (priority) {
            setIsVisible(true)
            return
        }

        const el = containerRef.current
        if (!el) return

        const scrollRoot = document.getElementById('site-main-scroll')

        const inView = () => {
            const rect = el.getBoundingClientRect()
            const rootRect = scrollRoot
                ? scrollRoot.getBoundingClientRect()
                : { top: 0, bottom: window.innerHeight }
            const margin = 200
            return rect.bottom >= rootRect.top - margin && rect.top <= rootRect.bottom + margin
        }

        if (inView()) {
            setIsVisible(true)
            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { root: scrollRoot, rootMargin: '200px' },
        )

        observer.observe(el)
        const raf = requestAnimationFrame(() => {
            if (inView()) {
                setIsVisible(true)
                observer.disconnect()
            }
        })
        return () => {
            observer.disconnect()
            cancelAnimationFrame(raf)
        }
    }, [priority])

    const portraitRel =
        typeof portraitRepoRel === 'string' && portraitRepoRel.length > 0 ? portraitRepoRel : null

    /** `null` = catalog not ready yet; boolean = tip presence. */
    const catalogPortrait: boolean | null = !portraitRel
        ? false
        : fileList
          ? catalogLeafAtPath(fileList, portraitRel) != null
          : null

    useEffect(() => {
        if (catalogPortrait !== null || !portraitRel) return
        let cancelled = false
        checkFileExists(portraitRel).then((ok) => {
            if (!cancelled) setAsyncPortraitOk(ok)
        })
        return () => {
            cancelled = true
        }
    }, [catalogPortrait, portraitRel])

    const portraitConfirmed =
        !portraitDisabled &&
        (catalogPortrait === true || (catalogPortrait === null && asyncPortraitOk))

    const mirrorList = Array.isArray(mirrorSrcs) ? (mirrorSrcs as string[]) : []
    const portraitMirrorList = Array.isArray(portraitMirrorSrcs) ? (portraitMirrorSrcs as string[]) : []
    const activeSrc =
        mirrorList[mirrorIndex] || (typeof optimizedSrc === 'string' ? optimizedSrc : undefined)
    const activePortraitSrc = portraitConfirmed
        ? portraitMirrorList[mirrorIndex] ||
          (typeof portraitOptimizedSrc === 'string' ? portraitOptimizedSrc : undefined)
        : undefined

    if (activeSrc) {
        finalProps['data-original-src'] = finalProps.src
        finalProps.src = activeSrc
    }

    const mirrorCount = mirrorList.length
    const clearLoadTimer = () => {
        if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current)
            loadTimerRef.current = null
        }
    }

    const applyAttempt = (next: ReturnType<typeof nextLoadAttempt>) => {
        setLqipDismissed(false)
        if (next.disablePortrait) setPortraitDisabled(true)
        setMirrorIndex(next.mirrorIndex)
        if (next.bumpAttempt) setAttempt((a) => a + 1)
        if (next.loadFailed) setLoadFailed(true)
    }

    const advanceMirror = () => {
        applyAttempt(
            nextLoadAttempt({
                mirrorIndex,
                mirrorCount,
                portraitActive: portraitConfirmed,
            }),
        )
    }

    // Timeout-driven failover — hung gateway requests never fire onError.
    // Empty src fails immediately (do not skip the timer and pulse forever).
    useEffect(() => {
        clearLoadTimer()
        const action = loadTimerAction({ isVisible, loadFailed, activeSrc })
        if (action === 'idle') return
        if (action === 'fail-empty') {
            setLoadFailed(true)
            return
        }
        loadTimerRef.current = setTimeout(() => {
            advanceMirror()
        }, LOAD_TIMEOUT_MS)
        return clearLoadTimer
        // eslint-disable-next-line react-hooks/exhaustive-deps -- advance on visible src / mirror / attempt only
    }, [isVisible, activeSrc, mirrorIndex, attempt, loadFailed, mirrorCount, portraitConfirmed])

    // If IntersectionObserver missed a remount, recover in-view images instead of pulsing forever.
    useEffect(() => {
        if (isVisible || loadFailed) return
        const el = containerRef.current
        if (!el) return
        const t = setTimeout(() => {
            const scrollRoot = document.getElementById('site-main-scroll')
            const rect = el.getBoundingClientRect()
            const rootRect = scrollRoot
                ? scrollRoot.getBoundingClientRect()
                : { top: 0, bottom: window.innerHeight }
            if (rect.bottom >= rootRect.top - 200 && rect.top <= rootRect.bottom + 200) {
                setIsVisible(true)
            }
        }, LOAD_TIMEOUT_MS)
        return () => clearTimeout(t)
    }, [isVisible, loadFailed, attempt, mirrorIndex])

    const handleRetry = () => {
        clearLoadTimer()
        const next = retryLoadState()
        setLoadFailed(next.loadFailed)
        setPortraitDisabled(next.disablePortrait)
        setLqipDismissed(false)
        setMirrorIndex(next.mirrorIndex)
        if (next.bumpAttempt) setAttempt((a) => a + 1)
    }

    // Wide book diagrams often have index/API dimensions that do not match the decoded bitmap;
    // a forced aspect-ratio box then leaves a large empty band above the caption (especially on mobile).
    const isBookIllustration = /\bbook-illustration\b/.test(processedClassName || '')
    const hasPortraitSibling = typeof activePortraitSrc === 'string' && activePortraitSrc.length > 0
    const imageIntrinsicKey = `${String(optimizedSrc ?? '')}:${String(lqipOptimizedSrc ?? '')}:${String(activePortraitSrc ?? '')}:${attempt}:${mirrorIndex}`
    const useRelayLqipUnderlay =
        typeof lqipOptimizedSrc === 'string' &&
        lqipOptimizedSrc.length > 0 &&
        !blurDataURL &&
        !loadFailed

    const containerStyle: React.CSSProperties = {}
    if (isBookIllustration) {
        if (blurDataURL) {
            containerStyle.backgroundImage = `url('${blurDataURL}')`
            containerStyle.backgroundSize = 'contain'
            containerStyle.backgroundPosition = 'center top'
            containerStyle.backgroundRepeat = 'no-repeat'
        }
    } else if (!hasPortraitSibling && finalProps.width && finalProps.height) {
        // Skip locked ratio when -portrait sibling may swap aspect at PORTRAIT_MEDIA_QUERY
        containerStyle.aspectRatio = `${finalProps.width}/${finalProps.height}`
        if (blurDataURL) {
            containerStyle.backgroundImage = `url('${blurDataURL}')`
            containerStyle.backgroundSize = 'cover'
            containerStyle.backgroundPosition = 'center'
        }
    } else {
        containerStyle.minHeight = '100px'
        if (blurDataURL) {
            containerStyle.backgroundImage = `url('${blurDataURL}')`
            containerStyle.backgroundSize = 'cover'
            containerStyle.backgroundPosition = 'center'
        }
    }

    const showPulse = !loadFailed && !lqipDismissed && !(useRelayLqipUnderlay && isVisible)
    const imgClassName = `relative z-[1] block w-full max-w-full h-auto transition-opacity duration-700 ease-in-out ${isVisible && !loadFailed ? 'opacity-100' : 'opacity-0'}`
    const mediaQuery =
        typeof portraitMedia === 'string' && portraitMedia.length > 0
            ? portraitMedia
            : PORTRAIT_MEDIA_QUERY

    const handleImgLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
        const img = event.currentTarget
        if (!rasterLoadSucceeded(img)) return
        clearLoadTimer()
        setLqipDismissed(true)
        setLoadFailed(false)
    }

    const handleImgError = (event: React.SyntheticEvent<HTMLImageElement>) => {
        const img = event.currentTarget
        if (isPlaceholderSrc(img.currentSrc || img.src)) return
        clearLoadTimer()
        advanceMirror()
    }

    const rasterImg = (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            alt={alt}
            className={imgClassName}
            {...finalProps}
            loading={priority || isVisible ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            src={activeSrc}
            onLoad={handleImgLoad}
            onError={handleImgError}
        />
    )

    return (
        <figure
            className={`${processedClassName || ''} overflow-hidden not-prose`}
            style={finalProps.width ? { maxWidth: `${finalProps.width}px` } : {}}
        >
            <div
                ref={containerRef}
                className={`relative w-full bg-slate-100 dark:bg-slate-900 overflow-hidden ${showPulse ? 'animate-pulse' : ''} ${isBookIllustration && !isVisible ? 'min-h-12' : ''}`}
                style={containerStyle}
            >
                {useRelayLqipUnderlay && isVisible ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        loading="lazy"
                        aria-hidden
                        alt=""
                        src={lqipOptimizedSrc}
                        className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ease-out ${
                            lqipDismissed ? 'opacity-0' : 'opacity-100'
                        } ${
                            isBookIllustration
                                ? 'object-contain object-top scale-105 blur-md'
                                : 'object-cover scale-105 blur-md'
                        }`}
                    />
                ) : null}
                {/* Art direction only when tip catalog / QUERY confirms -portrait sibling */}
                {isVisible && !loadFailed && hasPortraitSibling ? (
                    <picture key={imageIntrinsicKey}>
                        <source media={mediaQuery} srcSet={activePortraitSrc as string} />
                        {rasterImg}
                    </picture>
                ) : isVisible && !loadFailed && activeSrc ? (
                    <React.Fragment key={imageIntrinsicKey}>{rasterImg}</React.Fragment>
                ) : null}
                {loadFailed ? (
                    <div
                        className="relative z-[2] flex min-h-[6rem] flex-col items-center justify-center gap-2 px-3 py-6 text-center"
                        role="alert"
                    >
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Image failed to load from Relay mirrors.
                        </p>
                        <button
                            type="button"
                            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                            onClick={handleRetry}
                        >
                            Retry
                        </button>
                    </div>
                ) : null}
            </div>
            {children ? (
                <figcaption className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic text-justify px-2">
                    {children}
                </figcaption>
            ) : alt ? (
                <figcaption className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic text-justify px-2">
                    {alt}
                </figcaption>
            ) : null}
        </figure>
    )
}
