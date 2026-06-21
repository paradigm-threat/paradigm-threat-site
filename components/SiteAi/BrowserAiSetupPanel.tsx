'use client'

import React from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import type { BrowserAiSetupReason } from '@/lib/browserAi/detectBrowserAiSupport'

type BrowserAiSetupPanelProps = {
  reason?: BrowserAiSetupReason
  variant?: 'modal' | 'page'
}

function setupHeadline (reason?: BrowserAiSetupReason): string {
  switch (reason) {
    case 'feature-disabled':
      return 'AI features are disabled on this deployment'
    case 'detection-timeout':
      return 'Browser AI check timed out'
    case 'webmcp-unavailable':
      return 'WebMCP or on-device model not ready'
    default:
      return 'Enable on-device AI in Chrome'
  }
}

export function BrowserAiSetupPanel ({
  reason,
  variant = 'modal',
}: BrowserAiSetupPanelProps) {
  const isPage = variant === 'page'

  return (
    <div className={`space-y-4 ${isPage ? '' : 'px-1 py-2'}`}>
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-2 min-w-0">
          <p className={`font-medium text-slate-100 ${isPage ? 'text-base' : 'text-sm'}`}>
            {setupHeadline(reason)}
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Experimental — desktop Chrome 146+ with built-in Gemini Nano. Mobile and other browsers are not supported.
          </p>
        </div>
      </div>

      {reason === 'feature-disabled' && (
        <p className="text-sm text-amber-400/90 leading-relaxed">
          This deployment needs{' '}
          <code className="text-[11px]">NEXT_PUBLIC_WEBMCP_ENABLED=1</code>{' '}
          in the build environment (e.g. Vercel Production env vars), then a redeploy.
        </p>
      )}

      {reason === 'detection-timeout' && (
        <p className="text-sm text-amber-400/90 leading-relaxed">
          The browser AI check did not finish in time. Refresh the page, confirm WebMCP and the on-device model below, then try again.
        </p>
      )}

      {reason === 'webmcp-unavailable' && (
        <p className="text-sm text-slate-400 leading-relaxed">
          Chrome has the Prompt API but WebMCP tools or the language model session are not available yet. Complete the steps below — this is separate from the site deployment flag.
        </p>
      )}

      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300 leading-relaxed">
        <li>
          Open{' '}
          <a
            href="chrome://flags/#enable-webmcp-testing"
            className="text-indigo-400 hover:underline break-all"
          >
            chrome://flags/#enable-webmcp-testing
          </a>
          {' '}→ set <strong>WebMCP testing</strong> to <strong>Enabled</strong> → Relaunch Chrome.
        </li>
        <li>
          Open{' '}
          <a
            href="chrome://on-device-internals"
            className="text-indigo-400 hover:underline break-all"
          >
            chrome://on-device-internals
          </a>
          {' '}and confirm the language model is available or finished downloading.
        </li>
        <li>Refresh this page, then try again.</li>
      </ol>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Refresh page
      </button>
    </div>
  )
}

export function BrowserAiUnsupportedPanel ({ variant = 'page' }: { variant?: 'modal' | 'page' }) {
  const isPage = variant === 'page'
  return (
    <div className={`space-y-3 ${isPage ? 'py-4' : 'px-1 py-2'}`}>
      <p className={`font-medium text-slate-100 ${isPage ? 'text-base' : 'text-sm'}`}>
        Not available on this device
      </p>
      <p className="text-sm text-slate-400 leading-relaxed">
        Site AI and the reply assistant need desktop Chrome with the Prompt API (Gemini Nano).
        They are hidden on mobile and unsupported browsers.
      </p>
    </div>
  )
}
