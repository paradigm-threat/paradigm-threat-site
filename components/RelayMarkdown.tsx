'use client'

import React, { useEffect, useMemo, useRef } from 'react'
import { MarkdownRenderer, configureRelayMarkdownWasm } from '@clevertree/relay-markdown'
import { filesMarkdownOverrides } from '@/lib/markdownComponentOverrides'
import { transformImageCaptions } from '@/components/Timeline/markdownTransform'

let wasmConfigured = false

function ensureWasmBase (): void {
  if (wasmConfigured || typeof window === 'undefined') return
  configureRelayMarkdownWasm(`${window.location.origin}/wasm/md2ast/`)
  wasmConfigured = true
}

export interface RelayMarkdownProps {
  content: string
  basePath?: string
  /** Repo-relative path for compile error panel. */
  sourcePath?: string
  className?: string
  /** Fired once when WASM markdown has rendered successfully. */
  onReady?: () => void
  /** Fired when compile/validation fails (`.relay-markdown-error` present). */
  onCompileError?: () => void
}

/** Client markdown via relay-runtime WASM + site component overrides. */
export function RelayMarkdown ({
  content,
  basePath = '',
  sourcePath,
  className = 'mdx-content',
  onReady,
  onCompileError,
}: RelayMarkdownProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const errorReportedRef = useRef(false)
  const readyReportedRef = useRef(false)

  useEffect(() => {
    ensureWasmBase()
  }, [])

  const overrides = useMemo(() => filesMarkdownOverrides(basePath), [basePath])
  const preparedContent = useMemo(() => transformImageCaptions(content), [content])

  useEffect(() => {
    errorReportedRef.current = false
    readyReportedRef.current = false
  }, [preparedContent, sourcePath])

  useEffect(() => {
    const root = hostRef.current
    if (!root) return

    const inspect = () => {
      if (root.querySelector('.relay-markdown-error')) {
        if (!errorReportedRef.current) {
          errorReportedRef.current = true
          onCompileError?.()
        }
        return
      }
      const article = root.querySelector('article.relay-markdown, article.mdx-content, article')
      if (article && !readyReportedRef.current) {
        readyReportedRef.current = true
        onReady?.()
      }
    }

    const obs = new MutationObserver(inspect)
    obs.observe(root, { childList: true, subtree: true })
    inspect()
    return () => obs.disconnect()
  }, [preparedContent, sourcePath, onReady, onCompileError])

  useEffect(() => {
    if (!content) return
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event('dynamic-index-update'))
    }, 150)
    return () => window.clearTimeout(id)
  }, [content])

  return (
    <div ref={hostRef}>
      <MarkdownRenderer
        content={preparedContent}
        overrides={overrides}
        className={className}
        sourcePath={sourcePath}
      />
    </div>
  )
}
