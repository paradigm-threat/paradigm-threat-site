'use client'

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { ImageGalleryContext, ImageGalleryOverlay } from '@/components/Image/ImageGalleryContext'
import type { GalleryImage, ImageGalleryContextType } from '@/components/Image/ImageGalleryContext'
import type { TimelineEntry } from '@/components/TimelineContext'
import { timelineMediaPath } from '@/lib/timelineMedia'

interface TimelineGalleryImage extends GalleryImage {
    eventId: string
}

interface TimelineGalleryProviderProps {
    events: TimelineEntry[]
    baseUrl: string
    selectedEventId: string | null
    onSelectEvent: (entry: TimelineEntry) => void
    children: React.ReactNode
}

/**
 * Provides a custom ImageGalleryContext that contains ALL timeline images
 * (from every event's media[]), not just the currently rendered event.
 *
 * When the user navigates in the image overlay to an image belonging to a
 * different event, it calls onSelectEvent to switch the active event.
 */
export function TimelineGalleryProvider({
    events,
    baseUrl,
    selectedEventId,
    onSelectEvent,
    children,
}: TimelineGalleryProviderProps) {
    // Build the complete, ordered image list from all events' media arrays.
    const globalImages = useMemo<TimelineGalleryImage[]>(() => {
        return events.flatMap((event) =>
            (event.media || []).flatMap((entry) => {
                const path = timelineMediaPath(entry)
                if (!path) return []
                const img: TimelineGalleryImage = {
                    src: `${baseUrl}${path}`,
                    alt: path.split('/').pop()?.split('.')[0]?.replace(/_/g, ' ') || '',
                    eventId: event.id,
                }
                return [img]
            })
        )
    }, [events, baseUrl])

    // Stable lookup: src -> eventId
    const srcToEventId = useMemo(() => {
        const map = new Map<string, string>()
        for (const img of globalImages) {
            map.set(img.src, img.eventId)
        }
        return map
    }, [globalImages])

    // Stable lookup: eventId -> TimelineEntry
    const eventById = useMemo(() => {
        const map = new Map<string, TimelineEntry>()
        for (const e of events) map.set(e.id, e)
        return map
    }, [events])

    const [currentIndex, setCurrentIndex] = useState(-1)
    const [isOpen, setIsOpen] = useState(false)
    const [overrideImages, setOverrideImages] = useState<GalleryImage[] | null>(null)
    const [imagesState, setImagesState] = useState<GalleryImage[]>([...globalImages])

    // Use a ref for the mutable images array to avoid re-render loops during registration.
    const imagesRef = useRef<GalleryImage[]>([...globalImages])

    // When globalImages changes (events reload), reset the ref and state
    useEffect(() => {
        imagesRef.current = [...globalImages]
        queueMicrotask(() => setImagesState([...globalImages]))
    }, [globalImages])

    const registerImage = useCallback((img: GalleryImage) => {
        if (!img.src) return
        if (imagesRef.current.some((i) => i.src === img.src)) return
        imagesRef.current = [...imagesRef.current, img]
        setImagesState([...imagesRef.current])
    }, [])

    const syncGalleryImageMeta = useCallback((img: GalleryImage) => {
        if (!img.src) return
        const existingIdx = imagesRef.current.findIndex((i) => i.src === img.src)
        if (existingIdx === -1) return
        const existing = imagesRef.current[existingIdx]!
        imagesRef.current[existingIdx] = {
            ...existing,
            alt: img.alt || existing.alt,
            children: img.children ?? existing.children,
            highResSrc: img.highResSrc || existing.highResSrc,
        }
    }, [])

    const getGalleryImage = useCallback((src: string) => {
        return imagesRef.current.find((i) => i.src === src)
    }, [])

    const unregisterImage = useCallback((_src: string) => {
        // No-op for timeline: images are permanent
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

    // When currentIndex changes while overlay is open, check if the image
    // belongs to a different event and switch accordingly.
    const prevIndexRef = useRef(currentIndex)

    useEffect(() => {
        if (!isOpen || currentIndex < 0) {
            prevIndexRef.current = currentIndex
            return
        }
        if (currentIndex === prevIndexRef.current) return
        prevIndexRef.current = currentIndex

        const img = imagesRef.current[currentIndex]
        if (!img) return
        const eventId = srcToEventId.get(img.src)
        if (eventId && eventId !== selectedEventId) {
            const entry = eventById.get(eventId)
            if (entry) {
                onSelectEvent(entry)
            }
        }
    }, [currentIndex, isOpen, selectedEventId, srcToEventId, eventById, onSelectEvent])

    const contextValue = useMemo<ImageGalleryContextType>(
        () => ({
            images: overrideImages ?? imagesState,
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
        }),
        [
            overrideImages,
            imagesState,
            registerImage,
            syncGalleryImageMeta,
            unregisterImage,
            currentIndex,
            isOpen,
            openGallery,
            clearGalleryOverride,
            getGalleryImage,
        ]
    )

    return (
        <ImageGalleryContext.Provider value={contextValue}>
            {children}
            <ImageGalleryOverlay />
        </ImageGalleryContext.Provider>
    )
}
