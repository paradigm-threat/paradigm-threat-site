'use client'

import React, { useEffect, useLayoutEffect, memo, useSyncExternalStore } from 'react'
import { Maximize2 } from 'lucide-react'
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary'
import OptimizedImage from './OptimizedImage'
import { processImageProps } from '@/components/helpers/imageHelper'
import { remoteRelay } from '@/lib/remoteRelayStore'
import { onToggle } from '@/components/helpers/inputHelper'
import { useImageGallery } from './ImageGalleryContext'

interface PopImageProps {
    children?: any,
    className?: string,
    basePath?: string,
    [key: string]: any
}

function safeImgId(src: unknown): string {
    if (typeof src !== 'string') return 'img-unknown'
    return `img-${src.replace(/[^a-zA-Z0-9]/g, '-')}`
}

const PopImage = memo(function PopImage({ ...props }: PopImageProps) {
    const { registerImage, syncGalleryImageMeta, unregisterImage, images, currentIndex, setCurrentIndex, setIsOpen } = useImageGallery()
    const filesRoot = useSyncExternalStore(
        (cb) => remoteRelay.subscribe(cb),
        () => remoteRelay.getSnapshot().filesBaseUrl,
        () => remoteRelay.getSnapshot().filesBaseUrl,
    )
    const srcProps = processImageProps(props, props.basePath, filesRoot)
    const { children, alt, src, highResSrc } = srcProps
    const srcStr = typeof src === 'string' ? src : ''

    useLayoutEffect(() => {
        if (!srcStr) return
        syncGalleryImageMeta({ src: srcStr, alt, children, highResSrc })
    }, [srcStr, alt, children, highResSrc, syncGalleryImageMeta])

    useEffect(() => {
        if (!srcStr) return
        registerImage({ src: srcStr, alt, children, highResSrc })
        return () => unregisterImage(srcStr)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- register once per src; layout effect syncs caption metadata
    }, [srcStr, registerImage, unregisterImage])

    function toggleFullscreen() {
        const selfIndex = images.findIndex(img => img.src === src);
        if (selfIndex !== -1) {
            setCurrentIndex(selfIndex);
            setIsOpen(true);
        }
    }

    // Handles deep linking for this specific image on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash;
        if (hash.startsWith('#img=')) {
            const targetSrc = decodeURIComponent(hash.slice(5));
            if (targetSrc === src) {
                const selfIndex = images.findIndex(img => img.src === src);
                if (selfIndex !== -1) {
                    setCurrentIndex(selfIndex);
                    setIsOpen(true);

                    // Scroll immediately
                    requestAnimationFrame(() => {
                        const id = safeImgId(src);
                        const el = document.getElementById(id);
                        if (el) {
                            el.scrollIntoView({ behavior: 'auto', block: 'center' });
                        }
                    });
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when gallery membership count changes
    }, [src, images.length, setCurrentIndex, setIsOpen])

    const userClasses = srcProps.className || ''
    const hasFloat = userClasses.includes('float-')
    const hasClear = userClasses.includes('clear-')
    const hasMargin = userClasses.includes('m-') || userClasses.includes('mx-') || userClasses.includes('my-')

    const { className: _className, children: _children, basePath: _basePath, highResSrc: _highResSrc, ...optimizedImageProps } = srcProps;

    // Outer <aside> keeps PopImage out of Reading Mode; click target stays on the inner control.
    const figureLabel =
        typeof alt === 'string' && alt.trim().length > 0 ? alt.trim() : 'Figure'

    return (
        <aside
            className={`${userClasses} ${!hasFloat && !hasClear ? 'clear-both' : ''} ${!hasMargin ? 'm-auto' : ''} w-fit not-prose`}
            data-pt-popimage="true"
            aria-label={figureLabel}
            style={{ maxWidth: srcProps.width ? `${srcProps.width}px` : '100%' }}
        >
            <div
                id={safeImgId(src)}
                className="cursor-pointer group shadow-lg hover:shadow-xl dark:shadow-blue-900/10 transition-shadow duration-300 rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800"
                {...onToggle(toggleFullscreen)}
            >
                <div className="relative group">
                    <OptimizedImage
                        {...optimizedImageProps}
                    >
                        {children}
                    </OptimizedImage>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center" aria-hidden="true">
                        <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" size={48} />
                    </div>
                </div>
            </div>
        </aside>
    )
})

export default function PopImageErrorBoundary(props: PopImageProps) {
    return (
        <ErrorBoundary assetName="PopImage">
            <PopImage {...props} />
        </ErrorBoundary>
    )
}
