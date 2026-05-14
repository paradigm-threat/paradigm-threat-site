'use client'

import React, { useEffect, useMemo } from 'react'
import { MarkdownRenderer, configureMd2astWasm, type MdOverrides } from '@/lib/md2ast-react'
import { PopImage } from '@/components'
import { TimelineAwareLink } from '@/components/Timeline/TimelineAwareLink'
import { getDimensionsFromIndex, resolveImagePath } from '@/components/helpers/imageHelper'

let wasmConfigured = false

function ensureWasmBase (): void {
  if (wasmConfigured || typeof window === 'undefined') return
  configureMd2astWasm(`${window.location.origin}/wasm/md2ast/`)
  wasmConfigured = true
}

export interface RelayTimelineMarkdownProps {
  content: string
  basePath: string
  index?: Record<string, unknown> | null
  className?: string
}

function captionOverrides (): MdOverrides {
  return {
    a: (props) => <TimelineAwareLink {...props} />,
  }
}

/** Nested caption markdown inside PopImage (links only). */
function PopImageCaption ({ text }: { text: string }) {
  return (
    <MarkdownRenderer content={text} overrides={captionOverrides()} className="relay-markdown-caption" />
  )
}

export function RelayTimelineMarkdown ({
  content,
  basePath,
  index = null,
  className = 'relay-markdown',
}: RelayTimelineMarkdownProps) {
  useEffect(() => {
    ensureWasmBase()
  }, [])

  const overrides = useMemo((): MdOverrides => ({
    img: (props) => {
      const resolved = typeof props.src === 'string' ? resolveImagePath(props.src, basePath).split('?')[0] : ''
      const dims = index && resolved ? getDimensionsFromIndex(index, resolved) : undefined
      return (
        <PopImage
          {...props}
          basePath={basePath}
          intrinsicWidth={dims?.width}
          intrinsicHeight={dims?.height}
          className={props.className as string | undefined}
        />
      )
    },
    PopImage: (props) => {
      const captionText = typeof props.children === 'string' ? props.children : null
      const resolved = typeof props.src === 'string' ? resolveImagePath(props.src, basePath).split('?')[0] : ''
      const dims = index && resolved ? getDimensionsFromIndex(index, resolved) : undefined
      return (
        <PopImage
          {...props}
          basePath={basePath}
          intrinsicWidth={dims?.width}
          intrinsicHeight={dims?.height}
          className={props.className as string | undefined}
        >
          {captionText ? <PopImageCaption text={captionText} /> : null}
        </PopImage>
      )
    },
    a: (props) => <TimelineAwareLink {...props} />,
  }), [basePath, index])

  return (
    <MarkdownRenderer content={content} overrides={overrides} className={className} />
  )
}
