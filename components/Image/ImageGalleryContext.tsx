'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'

export interface GalleryImage {
    src: string
    alt?: string
    children?: React.ReactNode
    highResSrc?: string
}

export interface ImageGalleryContextType {
    images: GalleryImage[]
    registerImage: (img: GalleryImage) => void
    unregisterImage: (src: string) => void
    currentIndex: number
    setCurrentIndex: (index: number) => void
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    /** When set, the overlay shows only this list (e.g. one change-log entry) instead of all registered images. */
    overrideImages: GalleryImage[] | null
    openGallery: (items: GalleryImage[], startIndex?: number) => void
    clearGalleryOverride: () => void
}

const ImageGalleryContext = createContext<ImageGalleryContextType | undefined>(undefined)
export { ImageGalleryContext }

export function ImageGalleryProvider({ children }: { children: React.ReactNode }) {
    const [images, setImages] = useState<GalleryImage[]>([])
    const [currentIndex, setCurrentIndex] = useState(-1)
    const [isOpen, setIsOpen] = useState(false)
    const [overrideImages, setOverrideImages] = useState<GalleryImage[] | null>(null)

    // Using a ref to track images to avoid re-renders during registration loop
    const imagesRef = useRef<GalleryImage[]>([])

    const registerImage = useCallback((img: GalleryImage) => {
        if (!imagesRef.current.find(i => i.src === img.src)) {
            imagesRef.current = [...imagesRef.current, img]
            setImages([...imagesRef.current])
        }
        return () => {
            imagesRef.current = imagesRef.current.filter(i => i.src !== img.src)
            setImages([...imagesRef.current])
        }
    }, [])

    const unregisterImage = useCallback((src: string) => {
        imagesRef.current = imagesRef.current.filter(i => i.src !== src)
        setImages([...imagesRef.current])
    }, [])

    const clearGalleryOverride = useCallback(() => {
        setOverrideImages(null)
    }, [])

    const openGallery = useCallback((items: GalleryImage[], startIndex = 0) => {
        const list = items.filter((i): i is GalleryImage => Boolean(i?.src))
        if (list.length === 0) return
        setOverrideImages(list)
        setCurrentIndex(Math.min(Math.max(0, startIndex), list.length - 1))
        setIsOpen(true)
    }, [])

    const contextValue = useMemo(() => ({
        images,
        registerImage,
        unregisterImage,
        currentIndex,
        setCurrentIndex,
        isOpen,
        setIsOpen,
        overrideImages,
        openGallery,
        clearGalleryOverride
    }), [images, registerImage, unregisterImage, currentIndex, isOpen, overrideImages, openGallery, clearGalleryOverride]);

    return (
        <ImageGalleryContext.Provider value={contextValue}>
            {children}
            <ImageGalleryOverlay />
        </ImageGalleryContext.Provider>
    )
}

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { checkFileExists } from '@/components/helpers/imageHelper'
import {
    CANONICAL_SITE_ORIGIN,
    publicFilesAssetUrl,
    publicTimelineAssetUrl,
} from '@/lib/canonicalPublicSite'

const REPO_IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i

/** Same-origin public URL for the asset (GitLab Pages /files mirror), not `/api/image`. */
function pathToCanonicalFilesOrTimelineUrl(pathForAPI: string): string {
    const norm = pathForAPI.replace(/^\//, '').replace(/\/+/g, '/')
    if (norm.startsWith('media/')) {
        return publicTimelineAssetUrl(norm)
    }
    return publicFilesAssetUrl(norm)
}

/**
 * Direct CDN / canonical site URL for opening or sharing the image bytes outside the image API.
 */
export function galleryDirectPublicAssetUrl(image: GalleryImage): string | null {
    const hi = typeof image.highResSrc === 'string' ? image.highResSrc.trim() : ''
    if (hi && /^https?:\/\//i.test(hi)) return hi

    const rawSrc = typeof image.src === 'string' ? image.src : ''
    if (!rawSrc) return null

    if (rawSrc.startsWith('/api/image')) {
        try {
            const u = new URL(rawSrc, `${CANONICAL_SITE_ORIGIN}/`)
            const path = u.searchParams.get('path')
            if (path) return pathToCanonicalFilesOrTimelineUrl(path)
        } catch {
            return null
        }
    }

    if (/^https?:\/\//i.test(rawSrc)) {
        try {
            const u = new URL(rawSrc)
            if (u.origin === CANONICAL_SITE_ORIGIN) return rawSrc
        } catch {
            /* ignore */
        }
        return null
    }

    const pathOnly = rawSrc.split('?')[0]

    if (pathOnly.startsWith('/site/')) {
        return `${CANONICAL_SITE_ORIGIN}${pathOnly.replace(/\/+/g, '/')}`
    }

    if (!pathOnly.startsWith('/') || !REPO_IMAGE_EXT.test(pathOnly)) {
        return null
    }
    return pathToCanonicalFilesOrTimelineUrl(pathOnly)
}

/**
 * Fullscreen gallery `<img src>` must resolve to bytes this Next app can serve.
 * - ChangeLog passes root-relative repo paths (`/history/...png`) with no `highResSrc`; using them
 *   literally hits `localhost:3000/history/...` → 404.
 * - PopImage sets `highResSrc` to https://paradigmthreat.net/files/... which can lag GitLab Pages;
 *   on localhost prefer `/api/image` (mirrors) so new assets appear after push.
 */
export function galleryOverlayDisplaySrc (image: GalleryImage): string {
    const rawSrc = typeof image.src === 'string' ? image.src : ''
    const hi = typeof image.highResSrc === 'string' ? image.highResSrc : ''
    if (!rawSrc) return hi
    if (rawSrc.startsWith('/api/')) return rawSrc
    if (rawSrc.startsWith('/site/')) return hi || rawSrc
    if (/^https?:\/\//i.test(rawSrc)) return hi || rawSrc

    const pathOnly = rawSrc.split('?')[0]
    if (!pathOnly.startsWith('/') || !REPO_IMAGE_EXT.test(pathOnly)) {
        return hi || rawSrc
    }

    const isLocalDev =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

    if (isLocalDev || !hi) {
        return `/api/image?path=${encodeURIComponent(pathOnly)}&w=1600`
    }
    return hi
}

/** Folder segments of a repo-relative path as /search links (matches path-style search URLs). */
function GallerySrcBreadcrumb({ src }: { src: string }) {
    if (!src || src.startsWith('http://') || src.startsWith('https://')) {
        return <span>{src}</span>
    }
    const normalized = src.replace(/^\/+/, '').replace(/\/+/g, '/')
    const parts = normalized.split('/').filter(Boolean)
    if (parts.length === 0) {
        return <span>{src}</span>
    }
    const last = parts[parts.length - 1]
    const hasFileExtension = /\.[a-z0-9]{1,12}$/i.test(last)
    const folderSegments = hasFileExtension ? parts.slice(0, -1) : parts
    const fileName = hasFileExtension ? last : null

    if (folderSegments.length === 0) {
        return <span>{src}</span>
    }

    return (
        <span className="inline min-w-0">
            <span className="text-white/40">/</span>
            {folderSegments.map((seg, i) => {
                const href =
                    '/search/' + folderSegments.slice(0, i + 1).map(encodeURIComponent).join('/')
                return (
                    <span key={href} className="inline">
                        {i > 0 && <span className="text-white/40">/</span>}
                        <Link
                            href={href}
                            className="text-white/80 hover:text-white underline-offset-2 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {seg}
                        </Link>
                    </span>
                )
            })}
            {fileName && (
                <>
                    <span className="text-white/40">/</span>
                    <span className="text-white/50">{fileName}</span>
                </>
            )}
        </span>
    )
}

/**
 * Individual image item in the gallery to handle its own loading state
 * and prevent jumpy layout shifts during carousel transitions.
 */
function GalleryImageItem({
    image,
    direction,
    displayCaption,
    goNext,
    goPrev
}: {
    image: GalleryImage,
    direction: number,
    displayCaption: React.ReactNode,
    goNext: () => void,
    goPrev: () => void
}) {
    const [isHighResLoaded, setIsHighResLoaded] = useState(false)
    const [aspectRatio, setAspectRatio] = useState<number | null>(null)
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setAspectRatio(imgRef.current.naturalWidth / imgRef.current.naturalHeight)
            setIsHighResLoaded(true)
        }
    }, [image.src])

    return (
        <motion.div
            key={image.src}
            custom={direction}
            initial={{
                x: direction > 0 ? '50%' : direction < 0 ? '-50%' : 0,
                opacity: 0,
                scale: 0.95
            }}
            animate={{
                x: 0,
                opacity: 1,
                scale: 1
            }}
            exit={{
                x: direction < 0 ? '50%' : direction > 0 ? '-50%' : 0,
                opacity: 0,
                scale: 1.05
            }}
            transition={{
                x: { type: "spring", stiffness: 200, damping: 25 },
                opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={(e, { offset, velocity }) => {
                const swipe = offset.x
                if (swipe < -100) goNext()
                else if (swipe > 100) goPrev()
            }}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 flex h-full max-h-full min-h-0 w-full max-w-[99vw] ${aspectRatio && aspectRatio < 1 ? 'lg:max-w-[92vw]' : 'lg:max-w-[88vw]'} ${aspectRatio && aspectRatio < 1 ? 'flex-col lg:flex-row' : 'flex-col'} items-center justify-center gap-4 lg:gap-6 overflow-y-auto pointer-events-none`}
            style={{ willChange: 'transform, opacity' }}
        >
            <div className="relative flex min-h-0 max-h-full min-w-0 w-full flex-1 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- gallery overlay: dynamic highResSrc, next/image not used here */}
                <img
                    ref={imgRef}
                    src={galleryOverlayDisplaySrc(image)}
                    className="max-h-full max-w-full object-contain shadow-2xl rounded-lg pointer-events-auto cursor-grab active:cursor-grabbing transition-opacity duration-300"
                    style={{ opacity: (aspectRatio !== null || isHighResLoaded) ? 1 : 0 }}
                    alt={image.alt}
                    onDragStart={(e) => e.preventDefault()}
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth > 0) {
                            setAspectRatio(img.naturalWidth / img.naturalHeight);
                            setIsHighResLoaded(true);
                        }
                    }}
                />
            </div>
            {displayCaption && (
                <div className={`shrink-0 text-white/90 font-medium px-4 ${aspectRatio && aspectRatio < 1 ? 'lg:max-w-xs lg:max-h-full lg:text-left' : 'max-w-2xl text-center'} text-shadow-lg pointer-events-auto max-h-[min(28dvh,12rem)] overflow-y-auto lg:max-h-[40vh]`}>
                    {displayCaption}
                </div>
            )}
        </motion.div>
    )
}

export function ImageGalleryOverlay() {
    const { images, currentIndex, setCurrentIndex, isOpen, setIsOpen, overrideImages, clearGalleryOverride } = useImageGallery()
    const [direction, setDirection] = useState(0)
    const [remoteCaption, setRemoteCaption] = useState<string | null>(null)
    /** Avoid SSR/client mismatch; portal must mount after hydrate so overlay stacks above site chrome. */
    const [portalReady, setPortalReady] = useState(false)
    useEffect(() => {
        const id = requestAnimationFrame(() => {
            setPortalReady(true)
        })
        return () => cancelAnimationFrame(id)
    }, [])

    const galleryList = useMemo(
        () => (overrideImages && overrideImages.length > 0 ? overrideImages : images),
        [overrideImages, images]
    )

    const currentImage = galleryList[currentIndex] || null

    const directCdnUrl = useMemo(
        () => (currentImage ? galleryDirectPublicAssetUrl(currentImage) : null),
        [currentImage],
    )

    useEffect(() => {
        // Preload next and previous images
        if (isOpen && galleryList.length > 1) {
            const nextIdx = (currentIndex + 1) % galleryList.length;
            const prevIdx = (currentIndex - 1 + galleryList.length) % galleryList.length;

            [galleryList[nextIdx], galleryList[prevIdx]].forEach(img => {
                if (img) {
                    const u = galleryOverlayDisplaySrc(img)
                    if (u) {
                        const preload = new Image()
                        preload.src = u
                    }
                }
            });
        }
    }, [currentIndex, isOpen, currentImage?.src, galleryList])

    useEffect(() => {
        if (!isOpen || !currentImage) return

        const currentSrc = currentImage.src;
        if (typeof currentSrc === 'string' && !currentImage.children && !currentImage.alt && currentSrc && !currentSrc.startsWith('http')) {
            const FILES_BASE_URL = getPrimaryFilesBaseUrl();

            // Fix double slashes and ensure no leading slash for index check
            const cleanSrc = currentSrc.replace(/\/+/g, '/').replace(/^\/+/, '');
            const mdPath = `${cleanSrc}.md`;

            checkFileExists(mdPath).then(exists => {
                if (exists) {
                    fetch(`${FILES_BASE_URL}/${mdPath}`)
                        .then(res => res.ok ? res.text() : null)
                        .then(text => setRemoteCaption(text))
                        .catch(() => setRemoteCaption(null));
                } else {
                    queueMicrotask(() => setRemoteCaption(null));
                }
            });
        } else {
            queueMicrotask(() => setRemoteCaption(null));
        }
    }, [isOpen, currentImage])

    const goNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation()
        if (galleryList.length > 1) {
            setDirection(1)
            setCurrentIndex((currentIndex + 1) % galleryList.length)
        }
    }, [currentIndex, galleryList.length, setCurrentIndex])

    const goPrev = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation()
        if (galleryList.length > 1) {
            setDirection(-1)
            setCurrentIndex((currentIndex - 1 + galleryList.length) % galleryList.length)
        }
    }, [currentIndex, galleryList.length, setCurrentIndex])

    const closeFullscreen = useCallback(() => {
        if (window.location.hash.startsWith('#img=')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        clearGalleryOverride()
        setIsOpen(false)
    }, [setIsOpen, clearGalleryOverride])

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext(e);
            if (e.key === 'ArrowLeft') goPrev(e);
            if (e.key === 'Escape') closeFullscreen();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goNext, goPrev, closeFullscreen]);

    // Update hash for deep linking when open
    useEffect(() => {
        if (isOpen && currentImage) {
            const srcStr = typeof currentImage.src === 'string' ? currentImage.src : '';
            const newHash = `#img=${encodeURIComponent(srcStr)}`;
            if (window.location.hash !== newHash) {
                window.history.replaceState(null, '', newHash);
            }
        }
    }, [isOpen, currentIndex, currentImage]);

    if (!currentImage) return null

    const prevImage = galleryList.length > 1 ? galleryList[(currentIndex - 1 + galleryList.length) % galleryList.length] : null;
    const nextImage = galleryList.length > 1 ? galleryList[(currentIndex + 1) % galleryList.length] : null;

    const fallbackCaption =
        typeof currentImage.src === 'string'
            ? currentImage.src.split('/').pop()?.split('.')[0]?.replace(/_/g, ' ')
            : '';
    const displayCaption =
        typeof currentImage.children === 'string'
            ? currentImage.children
            : remoteCaption || currentImage.alt || fallbackCaption;

    const overlayTree = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[500] flex flex-col bg-black/95 pt-[env(safe-area-inset-top,0px)] select-none"
                    onClick={closeFullscreen}
                >
                    {/* Header: in document flow so image/caption never sit underneath it */}
                    <div className="z-50 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/70 px-3 py-3 backdrop-blur-sm md:px-4 md:py-3.5">
                        <div className="pointer-events-auto flex min-w-0 flex-1 items-baseline gap-2">
                            <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm text-white/50">
                                {currentIndex + 1} / {galleryList.length} —{' '}
                                {typeof currentImage.src === 'string' ? (
                                    <GallerySrcBreadcrumb src={currentImage.src} />
                                ) : (
                                    currentImage.src
                                )}
                            </div>
                            {directCdnUrl && (
                                <a
                                    href={directCdnUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 font-sans text-xs text-sky-400/90 underline-offset-2 hover:text-sky-300 hover:underline"
                                    title={directCdnUrl}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    CDN
                                </a>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={closeFullscreen}
                            className="pointer-events-auto z-50 -m-2 shrink-0 p-2 text-white/60 transition-colors hover:text-white md:-m-3 md:p-3"
                            aria-label="Close gallery"
                        >
                            <X size={28} className="md:h-8 md:w-8" />
                        </button>
                    </div>

                    {/* Image stage: bounded height below header and above mobile chrome */}
                    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {/* Navigation Previews */}
                    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-between px-4">
                        {/* Prev Preview */}
                        <div className="w-1/4 h-full flex items-center justify-start overflow-hidden">
                            <AnimatePresence initial={false} custom={direction}>
                                {prevImage && (
                                    <motion.button
                                        key={`prev-${prevImage.src}`}
                                        custom={direction}
                                        initial={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 0.2 }}
                                        exit={{ x: direction < 0 ? 100 : -100, opacity: 0 }}
                                        transition={{
                                            x: { type: "spring", stiffness: 300, damping: 30 },
                                            opacity: { duration: 0.2 }
                                        }}
                                        className="group pointer-events-auto cursor-pointer border-none bg-transparent outline-none appearance-none ml-8"
                                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                                        aria-label="Previous image"
                                    >
                                        <motion.div
                                            whileHover={{ opacity: 0.5, scale: 1.05 }}
                                            className="relative h-[25vh] aspect-square hidden lg:flex items-center justify-center rounded-2xl overflow-hidden"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element -- nav thumbnail: API proxy path */}
                                            <img
                                                src={`/api/image?path=${encodeURIComponent(prevImage.src)}&w=400`}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                alt="prev"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <ChevronLeft size={48} className="text-white" />
                                            </div>
                                        </motion.div>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Next Preview */}
                        <div className="w-1/4 h-full flex items-center justify-end overflow-hidden">
                            <AnimatePresence initial={false} custom={direction}>
                                {nextImage && (
                                    <motion.button
                                        key={`next-${nextImage.src}`}
                                        custom={direction}
                                        initial={{ x: direction < 0 ? -100 : 100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 0.2 }}
                                        exit={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
                                        transition={{
                                            x: { type: "spring", stiffness: 300, damping: 30 },
                                            opacity: { duration: 0.2 }
                                        }}
                                        className="group pointer-events-auto cursor-pointer border-none bg-transparent outline-none appearance-none mr-8"
                                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                                        aria-label="Next image"
                                    >
                                        <motion.div
                                            whileHover={{ opacity: 0.5, scale: 1.05 }}
                                            className="relative h-[25vh] aspect-square hidden lg:flex items-center justify-center rounded-2xl overflow-hidden"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element -- nav thumbnail: API proxy path */}
                                            <img
                                                src={`/api/image?path=${encodeURIComponent(nextImage.src)}&w=400`}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                alt="next"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <ChevronRight size={48} className="text-white" />
                                            </div>
                                        </motion.div>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Main Image */}
                    <div className="relative z-10 flex h-full min-h-0 w-full items-center justify-center py-2">
                        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                            <GalleryImageItem
                                key={currentImage.src}
                                image={currentImage}
                                direction={direction}
                                displayCaption={displayCaption}
                                goNext={goNext}
                                goPrev={goPrev}
                            />
                        </AnimatePresence>
                    </div>
                    </div>

                    {/* Mobile Controls — in flow so they do not cover caption */}
                    <div className="pointer-events-none z-50 flex shrink-0 justify-center gap-12 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:hidden">
                        <button type="button" onClick={(e) => { e.stopPropagation(); goPrev(); }} className={`pointer-events-auto rounded-full bg-white/10 p-4 text-white backdrop-blur-md ${!prevImage && 'opacity-20'}`} disabled={!prevImage} aria-label="Previous image">
                            <ChevronLeft size={32} />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); goNext(); }} className={`pointer-events-auto rounded-full bg-white/10 p-4 text-white backdrop-blur-md ${!nextImage && 'opacity-20'}`} disabled={!nextImage} aria-label="Next image">
                            <ChevronRight size={32} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )

    if (portalReady && typeof document !== 'undefined') {
        return createPortal(overlayTree, document.body)
    }
    return overlayTree
}

export function useImageGallery() {
    const context = useContext(ImageGalleryContext)
    if (context === undefined) {
        throw new Error('useImageGallery must be used within an ImageGalleryProvider')
    }
    return context
}
