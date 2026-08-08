'use client'

import {
    PORTRAIT_MEDIA_QUERY,
    checkFileExists,
    processImageProps,
} from '@/components/helpers/imageHelper'
import { useFiles } from '@/components/FilesContext'
import { catalogLeafAtPath } from '@/lib/catalogLeafAtPath'
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

/** 1x1 transparent GIF — use instead of empty string to avoid browser "download whole page" warning */
const EMPTY_SRC_PLACEHOLDER =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export default function OptimizedImage({ children, className, ...props }: OptimizedImageProps) {
    const srcProps: OptimizedImageProps = processImageProps({ ...props, className }, props.basePath)
    const { fileList } = useFiles()
    const [isVisible, setIsVisible] = useState(false)
    const [mirrorIndex, setMirrorIndex] = useState(0)
    /** Full-size decode finished — hide Relay LQIP underlay */
    const [lqipDismissed, setLqipDismissed] = useState(false)
    /** QUERY fallback only while files catalog is still loading. */
    const [asyncPortraitOk, setAsyncPortraitOk] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

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
            queueMicrotask(() => setIsVisible(true))
            return
        }

        const el = containerRef.current
        if (!el) return

        const syncVisible = () => {
            const rect = el.getBoundingClientRect()
            const margin = 200
            if (rect.bottom >= -margin && rect.top <= window.innerHeight + margin) {
                setIsVisible(true)
                return true
            }
            return false
        }

        if (syncVisible()) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '200px' },
        )

        observer.observe(el)
        requestAnimationFrame(() => {
            if (syncVisible()) observer.disconnect()
        })
        return () => observer.disconnect()
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

    const portraitConfirmed = catalogPortrait === true || (catalogPortrait === null && asyncPortraitOk)

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

    // Wide book diagrams often have index/API dimensions that do not match the decoded bitmap;
    // a forced aspect-ratio box then leaves a large empty band above the caption (especially on mobile).
    const isBookIllustration = /\bbook-illustration\b/.test(processedClassName || '')
    const hasPortraitSibling = typeof activePortraitSrc === 'string' && activePortraitSrc.length > 0
    const imageIntrinsicKey = `${String(optimizedSrc ?? '')}:${String(lqipOptimizedSrc ?? '')}:${String(activePortraitSrc ?? '')}`
    const useRelayLqipUnderlay =
        typeof lqipOptimizedSrc === 'string' && lqipOptimizedSrc.length > 0 && !blurDataURL

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

    const imgClassName = `relative z-[1] block w-full max-w-full h-auto transition-opacity duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`
    const displaySrc = isVisible && finalProps.src ? (finalProps.src as string) : EMPTY_SRC_PLACEHOLDER
    const mediaQuery =
        typeof portraitMedia === 'string' && portraitMedia.length > 0
            ? portraitMedia
            : PORTRAIT_MEDIA_QUERY

    const rasterImg = (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            loading="lazy"
            alt={alt}
            className={imgClassName}
            {...finalProps}
            src={displaySrc}
            onLoad={() => {
                setLqipDismissed(true)
            }}
            onError={() => {
                if (mirrorIndex + 1 < mirrorList.length) {
                    setMirrorIndex((i) => i + 1)
                }
            }}
        />
    )

    return (
        <figure
            className={`${processedClassName || ''} overflow-hidden not-prose`}
            style={finalProps.width ? { maxWidth: `${finalProps.width}px` } : {}}
        >
            <div
                ref={containerRef}
                key={imageIntrinsicKey}
                className={`relative w-full bg-slate-100 dark:bg-slate-900 overflow-hidden ${!isVisible ? 'animate-pulse' : ''} ${isBookIllustration && !isVisible ? 'min-h-12' : ''}`}
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
                {hasPortraitSibling ? (
                    <picture>
                        <source media={mediaQuery} srcSet={activePortraitSrc as string} />
                        {rasterImg}
                    </picture>
                ) : (
                    rasterImg
                )}
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
