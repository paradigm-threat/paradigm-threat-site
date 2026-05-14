'use client'

import React, { useEffect, useMemo } from 'react'
import { MarkdownRenderer, configureMd2astWasm, type MdOverrides } from '@/lib/md2ast-react'

let wasmConfigured = false

function ensureWasmBase (): void {
  if (wasmConfigured || typeof window === 'undefined') return
  configureMd2astWasm(`${window.location.origin}/wasm/md2ast/`)
  wasmConfigured = true
}

const chatOverrides: MdOverrides = {
  p: ({ children, ...rest }) => React.createElement('div', rest, children as React.ReactNode),
  h1: ({ children, ...rest }) => React.createElement('div', rest, children as React.ReactNode),
  h2: ({ children, ...rest }) => React.createElement('div', rest, children as React.ReactNode),
}

export function ChatMarkdown ({ content }: { content: string }) {
  useEffect(() => {
    ensureWasmBase()
  }, [])

  const overrides = useMemo(() => chatOverrides, [])

  return (
    <MarkdownRenderer
      content={content}
      overrides={overrides}
      className="chat-markdown text-sm"
    />
  )
}
