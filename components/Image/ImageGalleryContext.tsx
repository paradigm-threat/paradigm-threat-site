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
    /** Ref-only metadata sync (no re-render); used each PopImage render. */
    syncGalleryImageMeta: (img: GalleryImage) => void
    unregisterImage: (src: string) => void
    currentIndex: number
    setCurrentIndex: (index: number) => void
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    /** Replace registered images (e.g. ChangeLog thumbnails). */
    openGallery?: (items: GalleryImage[], startIndex?: number) => void
    clearGalleryOverride?: () => void
    /** Latest gallery row (includes children patched without re-render). */
    getGalleryImage: (src: string) => GalleryImage | undefined
}

const ImageGalleryContext = createContext<ImageGalleryContextType | undefined>(undefined)
export { ImageGalleryContext }

export function ImageGalleryProvider({ children }: { children: React.ReactNode }) {
    const [images, setImages] = useState<GalleryImage[]>([])
    const [overrideImages, setOverrideImages] = useState<GalleryImage[] | null>(null)
    const [currentIndex, setCurrentIndex] = useState(-1)
    const [isOpen, setIsOpen] = useState(false)

    const displayImages = overrideImages ?? images

    // Using a ref to track images to avoid re-renders during registration loop
    const imagesRef = useRef<GalleryImage[]>([])

    const registerImage = useCallback((img: GalleryImage) => {
        if (!img.src) return
        if (imagesRef.current.some(i => i.src === img.src)) return
        imagesRef.current = [...imagesRef.current, img]
        setImages([...imagesRef.current])
    }, [])

    /** Ref-only: keep captions/highRes in sync without unregister/register setState loops. */
    const syncGalleryImageMeta = useCallback((img: GalleryImage) => {
        if (!img.src) return
        const idx = imagesRef.current.findIndex(i => i.src === img.src)
        if (idx === -1) return
        imagesRef.current[idx] = { ...imagesRef.current[idx]!, ...img, src: img.src }
    }, [])

    const unregisterImage = useCallback((src: string) => {
        if (!src) return
        if (!imagesRef.current.some(i => i.src === src)) return
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

    const getGalleryImage = useCallback((src: string) => {
        return imagesRef.current.find(i => i.src === src)
    }, [])

    const contextValue = useMemo(() => ({
        images: displayImages,
        registerImage,
        syncGalleryImageMeta,
        unregisterImage,
        currentIndex,
        setCurrentIndex,
        isOpen,
        setIsOpen,
        openGallery,
        clearGalleryOverride,
        getGalleryImage,
    }), [displayImages, registerImage, syncGalleryImageMeta, unregisterImage, currentIndex, isOpen, openGallery, clearGalleryOverride, getGalleryImage]);

    return (
        <ImageGalleryContext.Provider value={contextValue}>
            {children}
            <ImageGalleryOverlay />
        </ImageGalleryContext.Provider>
    )
}

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { checkFileExists } from '@/components/helpers/imageHelper'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'

const REPO_IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i

function galleryDisplaySrc (image: GalleryImage): string {
    const rawSrc = typeof image.src === 'string' ? image.src : ''
    const hi = typeof image.highResSrc === 'string' ? image.highResSrc : ''
    if (!rawSrc) return hi
    if (/^https?:\/\//i.test(rawSrc)) return hi || rawSrc
    const pathOnly = rawSrc.split('?')[0]
    if (pathOnly.startsWith('/') && REPO_IMAGE_EXT.test(pathOnly)) {
        return buildOptimizedAssetUrl(pathOnly, 1600)
    }
    return hi || rawSrc
}

/**
 * Individual image item in the gallery to handle its own loading state
 * and prevent jumpy layout shifts during carousel transitions.
 */
function GalleryImageItem({
    image,
    direction,
    goNext,
    goPrev
}: {
    image: GalleryImage,
    direction: number,
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
            className="relative z-10 max-w-[99vw] lg:max-w-[80vw] flex items-center justify-center pointer-events-none"
            style={{ willChange: 'transform, opacity', maxHeight: 'var(--gallery-image-max-h, calc(100vh - 6rem))' }}
        >
            <div className="relative flex items-center justify-center min-h-[200px] w-full" style={{ maxHeight: 'var(--gallery-image-max-h, calc(100vh - 6rem))' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- gallery overlay: dynamic highResSrc, next/image not used here */}
                <img
                    ref={imgRef}
                    src={galleryDisplaySrc(image)}
                    className="max-w-full object-contain shadow-2xl rounded-lg pointer-events-auto cursor-grab active:cursor-grabbing transition-opacity duration-300"
                    style={{ opacity: (aspectRatio !== null || isHighResLoaded) ? 1 : 0, maxHeight: 'var(--gallery-image-max-h, calc(100vh - 6rem))' }}
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
        </motion.div>
    )
}

export function ImageGalleryOverlay() {
    const { images, currentIndex, setCurrentIndex, isOpen, setIsOpen, clearGalleryOverride, getGalleryImage } = useImageGallery()
    const [direction, setDirection] = useState(0)
    const [remoteCaption, setRemoteCaption] = useState<string | null>(null)

    const currentImage = images[currentIndex] || null
    const liveImage = currentImage?.src ? (getGalleryImage(currentImage.src) ?? currentImage) : null
    const liveSrc = liveImage?.src
    const liveAlt = liveImage?.alt
    const liveChildren = liveImage?.children

    useEffect(() => {
        // Preload next and previous images
        if (isOpen && images.length > 1) {
            const nextIdx = (currentIndex + 1) % images.length;
            const prevIdx = (currentIndex - 1 + images.length) % images.length;

            [images[nextIdx], images[prevIdx]].forEach(img => {
                if (img) {
                    const preload = new Image();
                    preload.src = galleryDisplaySrc(img);
                }
            });
        }
    }, [currentIndex, isOpen, currentImage?.src, images])

    useEffect(() => {
        if (!isOpen || !liveSrc) return

        if (typeof liveSrc === 'string' && !liveChildren && !liveAlt && liveSrc && !liveSrc.startsWith('http')) {
            const FILES_BASE_URL = getPrimaryFilesBaseUrl();

            // Fix double slashes and ensure no leading slash for index check
            const cleanSrc = liveSrc.replace(/\/+/g, '/').replace(/^\/+/, '');
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
    }, [isOpen, liveSrc, liveAlt, liveChildren])

    const goNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation()
        if (images.length > 1) {
            setDirection(1)
            setCurrentIndex((currentIndex + 1) % images.length)
        }
    }, [currentIndex, images.length, setCurrentIndex])

    const goPrev = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation()
        if (images.length > 1) {
            setDirection(-1)
            setCurrentIndex((currentIndex - 1 + images.length) % images.length)
        }
    }, [currentIndex, images.length, setCurrentIndex])

    const closeFullscreen = useCallback(() => {
        if (window.location.hash.startsWith('#img=')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        setIsOpen(false)
        clearGalleryOverride?.()
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
        if (isOpen && currentImage?.src) {
            const srcStr = typeof currentImage.src === 'string' ? currentImage.src : '';
            const newHash = `#img=${encodeURIComponent(srcStr)}`;
            if (window.location.hash !== newHash) {
                window.history.replaceState(null, '', newHash);
            }
        }
    }, [isOpen, currentIndex, currentImage?.src]);

    useEffect(() => {
        if (!isOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [isOpen])

    if (!currentImage) return null

    const prevImage = images.length > 1 ? images[(currentIndex - 1 + images.length) % images.length] : null;
    const nextImage = images.length > 1 ? images[(currentIndex + 1) % images.length] : null;
    const fallbackCaption =
        typeof liveImage?.src === 'string'
            ? liveImage.src.split('/').pop()?.split('.')[0]?.replace(/_/g, ' ')
            : '';
    const displayCaption =
        liveImage?.children != null && liveImage.children !== ''
            ? liveImage.children
            : remoteCaption || liveImage?.alt || fallbackCaption;
    const hasCaption = Boolean(displayCaption)

    /** Body portal: #site-main-scroll uses z-0, which traps fixed overlays below the sticky header (z-100). */
    const overlay = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-black flex flex-col select-none"
                    onClick={closeFullscreen}
                    style={{
                        ['--gallery-image-max-h' as string]: hasCaption
                            ? 'calc(100vh - 3.5rem - min(22vh, 9rem))'
                            : 'calc(100vh - 3.5rem)',
                    }}
                >
                    {/* Header Controls */}
                    <div className="flex-shrink-0 h-14 px-4 flex justify-between items-center border-b border-white/10 bg-black/95 z-50">
                        <div className="text-white/50 text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis mr-4">
                            {currentIndex + 1} / {images.length} — {currentImage.src}
                        </div>
                        <button
                            onClick={closeFullscreen}
                            className="text-white/60 hover:text-white transition-colors p-2 z-50 pointer-events-auto"
                            aria-label="Close image gallery"
                        >
                            <X size={28} />
                        </button>
                    </div>

                    {/* Main image stage */}
                    <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 md:px-12">
                    {/* Navigation Previews */}
                    <div className="absolute inset-x-0 inset-y-0 pointer-events-none flex items-center justify-between px-4 z-40">
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
                                            {/* eslint-disable-next-line @next/next/no-img-element -- nav thumbnail: relay mirror */}
                                            <img
                                                src={buildOptimizedAssetUrl(prevImage.src, 400)}
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
                                            {/* eslint-disable-next-line @next/next/no-img-element -- nav thumbnail: relay mirror */}
                                            <img
                                                src={buildOptimizedAssetUrl(nextImage.src, 400)}
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
                    <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                        <GalleryImageItem
                            key={currentImage.src}
                            image={currentImage}
                            direction={direction}
                            goNext={goNext}
                            goPrev={goPrev}
                        />
                    </AnimatePresence>

                    {/* Mobile Controls */}
                    <div className="absolute bottom-4 left-0 right-0 md:hidden flex justify-center gap-12 pointer-events-none z-50">
                        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className={`p-4 rounded-full bg-white/10 backdrop-blur-md text-white pointer-events-auto ${!prevImage && 'opacity-20'}`} disabled={!prevImage}>
                            <ChevronLeft size={32} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className={`p-4 rounded-full bg-white/10 backdrop-blur-md text-white pointer-events-auto ${!nextImage && 'opacity-20'}`} disabled={!nextImage}>
                            <ChevronRight size={32} />
                        </button>
                    </div>
                    </div>

                    {hasCaption && (
                        <div
                            className="flex-shrink-0 max-h-[22vh] overflow-y-auto border-t border-white/10 bg-black/95 px-4 py-3 text-sm text-white/90 leading-relaxed pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mx-auto max-w-3xl text-center md:text-left">
                                {displayCaption}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )

    if (typeof document === 'undefined' || !document.body) return null
    return createPortal(overlay, document.body)
}

export function useImageGallery() {
    const context = useContext(ImageGalleryContext)
    if (context === undefined) {
        throw new Error('useImageGallery must be used within an ImageGalleryProvider')
    }
    return context
}
